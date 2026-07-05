import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface IStorageService {
  saveFile(relativePath: string, buffer: Buffer): Promise<void>;
  deleteFile(relativePath: string): Promise<void>;
  copyFile(sourceRelativePath: string, destRelativePath: string): Promise<void>;
  exists(relativePath: string): Promise<boolean>;
  ensureDir(relativePath: string): Promise<void>;
}

class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = config.uploads.baseDir;
    // Create base uploads directory if not exists
    this.ensureDirSync('');
  }

  private getAbsolutePath(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }

  async ensureDir(relativePath: string): Promise<void> {
    const absPath = this.getAbsolutePath(relativePath);
    await fsPromises.mkdir(absPath, { recursive: true });
  }

  private ensureDirSync(relativePath: string): void {
    const absPath = this.getAbsolutePath(relativePath);
    if (!fs.existsSync(absPath)) {
      fs.mkdirSync(absPath, { recursive: true });
    }
  }

  async saveFile(relativePath: string, buffer: Buffer): Promise<void> {
    const absPath = this.getAbsolutePath(relativePath);
    await fsPromises.mkdir(path.dirname(absPath), { recursive: true });
    await fsPromises.writeFile(absPath, buffer);
    logger.info(`File saved locally: ${relativePath}`);
  }

  async deleteFile(relativePath: string): Promise<void> {
    const absPath = this.getAbsolutePath(relativePath);
    try {
      if (fs.existsSync(absPath)) {
        await fsPromises.unlink(absPath);
        logger.info(`File deleted locally: ${relativePath}`);
      }
    } catch (error: any) {
      logger.error(`Error deleting file ${relativePath}: ${error.message}`);
    }
  }

  async copyFile(sourceRelativePath: string, destRelativePath: string): Promise<void> {
    const srcAbsPath = this.getAbsolutePath(sourceRelativePath);
    const destAbsPath = this.getAbsolutePath(destRelativePath);
    
    await fsPromises.mkdir(path.dirname(destAbsPath), { recursive: true });
    await fsPromises.copyFile(srcAbsPath, destAbsPath);
    logger.info(`File copied locally from ${sourceRelativePath} to ${destRelativePath}`);
  }

  async exists(relativePath: string): Promise<boolean> {
    const absPath = this.getAbsolutePath(relativePath);
    try {
      await fsPromises.access(absPath);
      return true;
    } catch {
      return false;
    }
  }
}

export const storageService = new LocalStorageService();
