import sharp from 'sharp';
import { storageService } from './storage.service';
import { logger } from '../utils/logger';

export interface ProcessedImageResult {
  originalPath: string;
  optimizedPath: string;
  thumbnailPath: string;
  width: number;
  height: number;
}

class ImageService {
  /**
   * Process an uploaded image buffer, generating original, optimized, and thumbnail versions.
   * Files are stored under:
   * - original: events/{eventId}/originals/{filename}
   * - optimized: events/{eventId}/optimized/{filename}
   * - thumbnail: events/{eventId}/thumbnails/{filename}
   */
  async processImage(
    buffer: Buffer,
    eventId: string,
    originalFilename: string
  ): Promise<ProcessedImageResult> {
    const timestamp = Date.now();
    const cleanFilename = originalFilename
      .replace(/[^a-zA-Z0-9.]/g, '_')
      .toLowerCase();
    const filename = `${timestamp}_${cleanFilename}`;

    const originalRelativePath = `events/${eventId}/originals/${filename}`;
    const optimizedRelativePath = `events/${eventId}/optimized/${filename}`;
    const thumbnailRelativePath = `events/${eventId}/thumbnails/${filename}`;

    try {
      // 1. Save original image
      await storageService.saveFile(originalRelativePath, buffer);

      // Get image metadata
      const imageInstance = sharp(buffer);
      const metadata = await imageInstance.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // 2. Generate optimized version (max width 1920px, jpeg format)
      let optimizedBuffer: Buffer;
      if (width > 1920) {
        optimizedBuffer = await imageInstance
          .resize({ width: 1920, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
      } else {
        optimizedBuffer = await imageInstance.jpeg({ quality: 85 }).toBuffer();
      }
      await storageService.saveFile(optimizedRelativePath, optimizedBuffer);

      // 3. Generate thumbnail version (max width 400px, jpeg format)
      const thumbnailBuffer = await sharp(buffer)
        .resize({ width: 400, height: 400, fit: 'cover' })
        .jpeg({ quality: 75 })
        .toBuffer();
      await storageService.saveFile(thumbnailRelativePath, thumbnailBuffer);

      return {
        originalPath: originalRelativePath,
        optimizedPath: optimizedRelativePath,
        thumbnailPath: thumbnailRelativePath,
        width,
        height,
      };
    } catch (error: any) {
      logger.error(`Error processing image ${originalFilename}: ${error.message}`);
      // Attempt cleanup if some files succeeded
      await storageService.deleteFile(originalRelativePath);
      await storageService.deleteFile(optimizedRelativePath);
      await storageService.deleteFile(thumbnailRelativePath);
      throw error;
    }
  }

  /**
   * Copy optimized photo to Resolume watch directory
   */
  async copyToResolume(eventId: string, filename: string, optimizedPath: string): Promise<void> {
    const resolumePath = `events/${eventId}/approved/${filename}`;
    await storageService.copyFile(optimizedPath, resolumePath);
  }

  /**
   * Remove photo from Resolume watch directory
   */
  async removeFromResolume(eventId: string, filename: string): Promise<void> {
    const resolumePath = `events/${eventId}/approved/${filename}`;
    await storageService.deleteFile(resolumePath);
  }
}

export const imageService = new ImageService();
export default imageService;
