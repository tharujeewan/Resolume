import { Request, Response, NextFunction } from 'express';
import { RoleName } from '@prisma/client';
import prisma from '../db/prisma';
import { ApiError } from '../middlewares/error';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        createdAt: true,
        role: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // SUPER_ADMIN or ORGANIZER

    if (!role || !Object.values(RoleName).includes(role)) {
      throw new ApiError(400, 'Invalid role name');
    }

    const dbRole = await prisma.role.findUnique({ where: { name: role as RoleName } });
    if (!dbRole) {
      throw new ApiError(404, 'Role not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { roleId: dbRole.id },
      select: {
        id: true,
        email: true,
        role: { select: { name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_ROLE_UPDATE',
        details: `Updated role of ${updatedUser.email} to ${role}`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      throw new ApiError(400, 'You cannot delete yourself');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    await prisma.user.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_DELETE',
        details: `Deleted user account: ${user.email}`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '100' } = req.query;
    const logs = await prisma.activityLog.findMany({
      take: parseInt(limit as string, 10),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany();
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body; // Expect array of { key: string, value: string }

    if (!settings || !Array.isArray(settings)) {
      throw new ApiError(400, 'settings must be an array');
    }

    for (const item of settings) {
      await prisma.setting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      });
    }

    res.status(200).json({ message: 'System settings updated successfully' });
  } catch (error) {
    next(error);
  }
};
