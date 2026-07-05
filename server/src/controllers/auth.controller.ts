import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { RoleName } from '@prisma/client';
import prisma from '../db/prisma';
import { config } from '../config';
import { ApiError } from '../middlewares/error';
import emailService from '../services/email.service';

const generateAccessToken = (userId: string, email: string, roleName: RoleName): string => {
  return jwt.sign(
    { id: userId, email, role: roleName },
    config.jwt.secret,
    { expiresIn: `${config.jwt.accessExpirationMinutes}m` }
  );
};

const generateAndSaveRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpirationDays);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError(400, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const organizerRole = await prisma.role.findUnique({
      where: { name: RoleName.ORGANIZER },
    });

    if (!organizerRole) {
      throw new ApiError(500, 'Default roles not seeded');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: organizerRole.id,
        isVerified: false,
        verificationToken,
      },
      include: { role: true },
    });

    // Send verification email
    const origin = req.headers.origin || `http://localhost:${config.port}`;
    await emailService.sendVerificationEmail(user.email, verificationToken, origin);

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_SIGNUP',
        details: `Organizer registered: ${user.email}`,
        ipAddress: req.ip,
      },
    });

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isVerified) {
      throw new ApiError(403, 'Please verify your email first');
    }

    const accessToken = generateAccessToken(user.id, user.email, user.role.name);
    const refreshToken = await generateAndSaveRefreshToken(user.id);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `Successful login: ${user.email}`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshTokens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { role: true } } },
    });

    if (!dbToken || dbToken.expiresAt < new Date()) {
      if (dbToken) {
        await prisma.refreshToken.delete({ where: { id: dbToken.id } });
      }
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    // Generate new access token
    const accessToken = generateAccessToken(
      dbToken.user.id,
      dbToken.user.email,
      dbToken.user.role.name
    );

    // Rotate refresh token: delete old, generate new
    await prisma.refreshToken.delete({ where: { id: dbToken.id } });
    const newRefreshToken = await generateAndSaveRefreshToken(dbToken.user.id);

    res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;

    const user = await prisma.user.findFirst({
      where: { verificationToken: token as string },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid verification token');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        details: `Email verified successfully: ${user.email}`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak user existence in database
      res.status(200).json({ message: 'If this email exists, a password reset link has been sent.' });
      return;
    }

    const resetPasswordToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date();
    resetPasswordExpires.setHours(resetPasswordExpires.getHours() + 1); // 1 hour validity

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken,
        resetPasswordExpires,
      },
    });

    const origin = req.headers.origin || `http://localhost:${config.port}`;
    await emailService.sendPasswordResetEmail(user.email, resetPasswordToken, origin);

    res.status(200).json({ message: 'If this email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        details: `Password reset success for: ${user.email}`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
