import { Request, Response, NextFunction } from 'express';
import { PhotoStatus, RoleName } from '@prisma/client';
import prisma from '../db/prisma';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Filter query based on organizer ownership
    const isSuperAdmin = userRole === RoleName.SUPER_ADMIN;
    const eventOwnerFilter = isSuperAdmin ? {} : { userId };

    // 1. Total events
    const totalEvents = await prisma.event.count({
      where: eventOwnerFilter,
    });

    // Get event IDs owned by organizer
    let eventIds: string[] = [];
    if (!isSuperAdmin) {
      const organizerEvents = await prisma.event.findMany({
        where: { userId },
        select: { id: true },
      });
      eventIds = organizerEvents.map((e: { id: string }) => e.id);
    }

    const photoFilter = isSuperAdmin ? {} : { eventId: { in: eventIds } };

    // 2. Count photos by status
    const statusCounts = await prisma.photo.groupBy({
      by: ['status'],
      where: photoFilter,
      _count: {
        id: true,
      },
    });

    // 3. Storage Usage sum in bytes
    const storageStats = await prisma.photo.aggregate({
      where: photoFilter,
      _sum: {
        size: true,
      },
    });

    // Format counts
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let deleted = 0;
    let totalUploads = 0;

    statusCounts.forEach((group) => {
      const count = group._count.id;
      totalUploads += count;
      if (group.status === PhotoStatus.APPROVED) approved = count;
      else if (group.status === PhotoStatus.PENDING) pending = count;
      else if (group.status === PhotoStatus.REJECTED) rejected = count;
      else if (group.status === PhotoStatus.DELETED) deleted = count;
    });

    // 4. Recent activity (uploads or admin logs)
    const recentActivity = await prisma.photo.findMany({
      where: photoFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    res.status(200).json({
      totalEvents,
      totalUploads: totalUploads - deleted, // Exclude deleted from total uploads
      stats: {
        approved,
        pending,
        rejected,
        deleted,
      },
      storageUsedBytes: storageStats._sum.size || 0,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

export const getUploadsOverTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const isSuperAdmin = userRole === RoleName.SUPER_ADMIN;

    // Get event IDs
    let eventIds: string[] = [];
    if (!isSuperAdmin) {
      const organizerEvents = await prisma.event.findMany({
        where: { userId },
        select: { id: true },
      });
      eventIds = organizerEvents.map((e) => e.id);
    }

    const photoFilter = isSuperAdmin ? {} : { eventId: { in: eventIds } };

    // Get uploads from last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const uploads = await prisma.photo.findMany({
      where: {
        ...photoFilter,
        createdAt: {
          gte: yesterday,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by hour
    const hourlyData: { [key: string]: number } = {};
    for (let i = 0; i < 24; i++) {
      const d = new Date();
      d.setHours(d.getHours() - i);
      const hourStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      hourlyData[hourStr] = 0;
    }

    uploads.forEach((upload) => {
      const hourStr = upload.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // Find the closest hour bucket
      const keys = Object.keys(hourlyData);
      const matchedKey = keys.find(k => k.split(':')[0] === hourStr.split(':')[0]);
      if (matchedKey) {
        hourlyData[matchedKey]++;
      }
    });

    const result = Object.keys(hourlyData)
      .map((key) => ({
        time: key,
        count: hourlyData[key],
      }))
      .reverse();

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
