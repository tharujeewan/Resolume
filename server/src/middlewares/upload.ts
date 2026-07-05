import multer from 'multer';
import { Request } from 'express';
import { config } from '../config';
import { ApiError } from './error';

// Use memory storage for direct processing with sharp
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (config.uploads.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Unsupported file format. Allowed formats: JPEG, PNG, WEBP, GIF. Received: ${file.mimetype}`) as any);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxSize,
  },
  fileFilter,
});
