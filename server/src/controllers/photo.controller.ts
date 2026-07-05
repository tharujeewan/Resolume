import { Request, Response, NextFunction } from 'express';
import { PhotoStatus, RoleName } from '@prisma/client';
import prisma from '../db/prisma';
import { ApiError } from '../middlewares/error';
import imageService from '../services/image.service';
import socketService from '../services/socket.service';

export const uploadPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventSlug } = req.body;
    if (!eventSlug) {
      throw new ApiError(400, 'eventSlug is required');
    }

    if (!req.file) {
      throw new ApiError(400, 'No image file uploaded');
    }

    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      include: {
        _count: {
          select: { photos: { where: { status: { not: PhotoStatus.DELETED } } } },
        },
      },
    });

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (event.status !== 'ACTIVE') {
      throw new ApiError(400, 'This event is not active or has been archived');
    }

    if (event._count.photos >= event.maxUploadLimit) {
      throw new ApiError(400, 'The maximum upload limit for this event has been reached');
    }

    // Process image using sharp
    const processed = await imageService.processImage(
      req.file.buffer,
      event.id,
      req.file.originalname,
      req.file.mimetype
    );

    const autoApprove = process.env.AUTO_APPROVE_PHOTOS === 'true';

    // Save metadata to database
    const photo = await prisma.photo.create({
      data: {
        eventId: event.id,
        originalName: req.file.originalname,
        filename: processed.originalPath.split('/').pop() || '',
        thumbnailFilename: processed.thumbnailPath,
        optimizedFilename: processed.optimizedPath,
        size: req.file.size,
        width: processed.width,
        height: processed.height,
        mimeType: req.file.mimetype,
        uploadedBy: req.ip,
        status: autoApprove ? PhotoStatus.APPROVED : PhotoStatus.PENDING,
      },
    });

    if (autoApprove) {
      const filename = processed.optimizedPath.split('/').pop() || '';
      await imageService.copyToResolume(event.id, filename, processed.optimizedPath);
      socketService.notifyPhotoApproved(event.id, photo);
      socketService.notifyPhotoUploaded(event.id, photo);
    } else {
      socketService.notifyPhotoUploaded(event.id, photo);
    }

    res.status(201).json({
      message: autoApprove
        ? 'Photo uploaded and approved successfully.'
        : 'Photo uploaded successfully and is pending moderation.',
      photo,
    });
  } catch (error) {
    next(error);
  }
};

export const getPhotos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.query;
    const { status, limit = '20', cursor } = req.query;

    if (!eventId) {
      throw new ApiError(400, 'eventId is required');
    }

    // Build query conditions
    const where: any = {
      eventId: eventId as string,
    };

    if (status) {
      where.status = status as PhotoStatus;
    } else {
      // By default do not return deleted photos
      where.status = { not: PhotoStatus.DELETED };
    }

    const takeCount = parseInt(limit as string, 10);

    const photos = await prisma.photo.findMany({
      where,
      take: takeCount + 1, // Get one extra to check for next cursor
      cursor: cursor ? { id: cursor as string } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | undefined = undefined;
    if (photos.length > takeCount) {
      const nextItem = photos.pop();
      nextCursor = nextItem?.id;
    }

    res.status(200).json({
      photos,
      nextCursor,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePhotoStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // APPROVED, REJECTED, DELETED

    if (!status || !Object.values(PhotoStatus).includes(status)) {
      throw new ApiError(400, 'Invalid photo status');
    }

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!photo) {
      throw new ApiError(404, 'Photo not found');
    }

    // Authenticated role checks
    const userId = req.user!.id;
    const userRole = req.user!.role;
    if (userRole !== RoleName.SUPER_ADMIN && photo.event.userId !== userId) {
      throw new ApiError(403, 'Forbidden: You do not own this event');
    }

    const oldStatus = photo.status;

    // Update status in DB
    const updatedPhoto = await prisma.photo.update({
      where: { id },
      data: { status: status as PhotoStatus },
    });

    // Handle Resolume local files synchronization
    const filename = photo.optimizedFilename?.split('/').pop() || '';

    if (status === PhotoStatus.APPROVED) {
      // Copy to Resolume watch folder
      if (photo.optimizedFilename) {
        await imageService.copyToResolume(photo.eventId, filename, photo.optimizedFilename);
      }
      // Broadcast real-time approved event for display walls
      socketService.notifyPhotoApproved(photo.eventId, updatedPhoto);
    } else {
      // If was previously approved, remove from watch folder
      if (oldStatus === PhotoStatus.APPROVED) {
        await imageService.removeFromResolume(photo.eventId, filename);
      }
    }

    // Notify organizers of status change
    socketService.notifyPhotoStatusChanged(photo.eventId, { photoId: id, status });

    res.status(200).json(updatedPhoto);
  } catch (error) {
    next(error);
  }
};

export const bulkUpdatePhotoStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { photoIds, status, eventId } = req.body;

    if (!eventId) {
      throw new ApiError(400, 'eventId is required');
    }

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      throw new ApiError(400, 'photoIds must be a non-empty array');
    }

    if (!status || !Object.values(PhotoStatus).includes(status)) {
      throw new ApiError(400, 'Invalid photo status');
    }

    // Authenticated role checks
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }
    if (userRole !== RoleName.SUPER_ADMIN && event.userId !== userId) {
      throw new ApiError(403, 'Forbidden');
    }

    // Get all matching photos
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        eventId,
      },
    });

    // Update in DB
    await prisma.photo.updateMany({
      where: {
        id: { in: photoIds },
        eventId,
      },
      data: { status: status as PhotoStatus },
    });

    // Resolume watch folder updates
    for (const photo of photos) {
      const filename = photo.optimizedFilename?.split('/').pop() || '';
      if (status === PhotoStatus.APPROVED) {
        if (photo.optimizedFilename) {
          await imageService.copyToResolume(eventId, filename, photo.optimizedFilename);
        }
        // Emit Socket approval for each photo
        const updatedPhoto = { ...photo, status };
        socketService.notifyPhotoApproved(eventId, updatedPhoto);
      } else {
        if (photo.status === PhotoStatus.APPROVED) {
          await imageService.removeFromResolume(eventId, filename);
        }
      }
    }

    // Broadcast bulk updates to Socket connections
    socketService.notifyBulkStatusChanged(eventId, { photoIds, status });

    res.status(200).json({ message: `Successfully updated ${photos.length} photos to ${status}` });
  } catch (error) {
    next(error);
  }
};
