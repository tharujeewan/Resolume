import { Request, Response, NextFunction } from 'express';
import { RoleName } from '@prisma/client';
import prisma from '../db/prisma';
import { ApiError } from '../middlewares/error';
import { config } from '../config';
import qrService from '../services/qr.service';

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, date, venue, startTime, endTime, theme, background, maxUploadLimit } = req.body;
    const userId = req.user!.id;

    // Check slug collision
    const existingEvent = await prisma.event.findUnique({ where: { slug } });
    if (existingEvent) {
      throw new ApiError(400, 'An event with this URL slug already exists. Please choose a different slug.');
    }

    const event = await prisma.event.create({
      data: {
        name,
        slug,
        description,
        date: new Date(date),
        venue,
        startTime,
        endTime,
        theme,
        background,
        maxUploadLimit: maxUploadLimit || 200,
        userId,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'EVENT_CREATE',
        details: `Created event: ${name} (${slug})`,
        ipAddress: req.ip,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let events;
    if (userRole === RoleName.SUPER_ADMIN) {
      events = await prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
        include: { organizer: { select: { email: true, firstName: true, lastName: true } } },
      });
    } else {
      events = await prisma.event.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.status(200).json(events);
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { photos: true },
        },
      },
    });

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (userRole !== RoleName.SUPER_ADMIN && event.userId !== userId) {
      throw new ApiError(403, 'Forbidden: You do not own this event');
    }

    res.status(200).json(event);
  } catch (error) {
    next(error);
  }
};

export const getEventBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        date: true,
        venue: true,
        startTime: true,
        endTime: true,
        status: true,
        theme: true,
        background: true,
        logo: true,
        maxUploadLimit: true,
        _count: {
          select: {
            photos: {
              where: {
                status: 'APPROVED',
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    res.status(200).json(event);
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (userRole !== RoleName.SUPER_ADMIN && event.userId !== userId) {
      throw new ApiError(403, 'Forbidden: You do not own this event');
    }

    const { name, slug, description, date, venue, startTime, endTime, status, theme, background, maxUploadLimit } = req.body;

    if (slug && slug !== event.slug) {
      const existingSlug = await prisma.event.findUnique({ where: { slug } });
      if (existingSlug) {
        throw new ApiError(400, 'Slug already in use');
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        date: date ? new Date(date) : undefined,
        venue,
        startTime,
        endTime,
        status,
        theme,
        background,
        maxUploadLimit,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'EVENT_UPDATE',
        details: `Updated event: ${updatedEvent.name}`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json(updatedEvent);
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (userRole !== RoleName.SUPER_ADMIN && event.userId !== userId) {
      throw new ApiError(403, 'Forbidden: You do not own this event');
    }

    await prisma.event.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'EVENT_DELETE',
        details: `Deleted event: ${event.name} (${event.slug})`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const downloadQR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { format = 'png' } = req.query; // png, svg, pdf
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (userRole !== RoleName.SUPER_ADMIN && event.userId !== userId) {
      throw new ApiError(403, 'Forbidden');
    }

    // Generate URL that guests will scan
    const origin = req.headers.origin || `http://localhost:${config.port}`;
    // Replace URL scheme or use target domain
    const host = process.env.PUBLIC_DOMAIN || origin;
    const guestUrl = `${host}/e/${event.slug}`;

    if (format === 'svg') {
      const svgString = await qrService.generateSVG(guestUrl);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="qrcode-${event.slug}.svg"`);
      res.status(200).send(svgString);
    } else if (format === 'pdf') {
      const pdfBuffer = await qrService.generatePDF(guestUrl, event.name);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="flyer-${event.slug}.pdf"`);
      res.status(200).send(pdfBuffer);
    } else {
      const pngBuffer = await qrService.generatePNG(guestUrl);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="qrcode-${event.slug}.png"`);
      res.status(200).send(pngBuffer);
    }
  } catch (error) {
    next(error);
  }
};
