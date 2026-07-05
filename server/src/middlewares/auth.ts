import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RoleName } from '@prisma/client';
import { config } from '../config';
import { ApiError } from './error';
import prisma from '../db/prisma';

export interface TokenPayload {
  id: string;
  email: string;
  role: RoleName;
}

export const auth = (...requiredRoles: RoleName[]) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Please authenticate');
    }

    const token = authHeader.split(' ')[1];
    let payload: TokenPayload;
    
    try {
      payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch (e) {
      throw new ApiError(401, 'Invalid or expired token');
    }

    // Verify user exists in DB and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { role: true },
    });

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Attach user metadata to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
    };

    // Role checks
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role.name)) {
      throw new ApiError(403, 'Forbidden: Insufficient permissions');
    }

    next();
  } catch (error) {
    next(error);
  }
};
