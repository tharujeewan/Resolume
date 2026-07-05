import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from './error';

export const validate = (schema: AnyZodObject) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = error.errors
        .map((details) => `${details.path.join('.')}: ${details.message}`)
        .join(', ');
      next(new ApiError(400, errorMessage));
    } else {
      next(error);
    }
  }
};
