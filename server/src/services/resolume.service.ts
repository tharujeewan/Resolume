import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class ResolumeService {
  private client: AxiosInstance;
  private enabled: boolean;
  private defaultLayer: number;
  private defaultClip: number;

  constructor() {
    this.enabled = config.resolume.enabled;
    this.defaultLayer = config.resolume.layer;
    this.defaultClip = config.resolume.clip;

    // Initialize Axios client pointing to local Resolume REST API endpoint
    const baseURL = `http://${config.resolume.host}:${config.resolume.port}/api/v1`;
    this.client = axios.create({
      baseURL,
      timeout: 4000,
    });
  }

  /**
   * Health Check: verify if Resolume Webserver is active and accessible.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const response = await this.client.get('/product');
      logger.info(`Resolume Health Check Successful: Running ${response.data?.name || 'Arena'}`);
      return true;
    } catch (error: any) {
      logger.warn(`Resolume connection check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Format absolute file path to URL-encoded URI required by Resolume:
   * e.g., C:\EventWall\file.jpg -> file:///C:/EventWall/file.jpg
   */
  formatFileUrl(absolutePath: string): string {
    // Replace backslashes with forward slashes
    let normalized = absolutePath.replace(/\\/g, '/');
    
    // Prefix with file:/// if not already present
    if (!normalized.startsWith('file:///')) {
      if (normalized.startsWith('/')) {
        normalized = `file://${normalized}`;
      } else {
        normalized = `file:///${normalized}`;
      }
    }

    // Split at file:/// to URL-encode the path segment while preserving the scheme
    const prefix = 'file:///';
    const pathSegment = normalized.substring(prefix.length);
    const encodedPath = pathSegment
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/');

    return `${prefix}${encodedPath}`;
  }

  /**
   * Dynamically fetch Resolume Swagger description to discover schema requirements
   * of the openfile endpoint (whether FileUrl is a plain string or a JSON object).
   */
  private async detectFileUrlSchema(): Promise<'string' | 'url_object' | 'path_object'> {
    try {
      const swaggerRes = await this.client.get('/docs/rest/swagger.yaml', {
        baseURL: `http://${config.resolume.host}:${config.resolume.port}`, // YAML sits outside /api/v1
        responseType: 'text',
      });
      const yaml = swaggerRes.data as string;
      const fileUrlMatch = yaml.match(/FileUrl:[\s\S]*?(?=\n\w|\Z)/);
      
      if (fileUrlMatch) {
        const schemaText = fileUrlMatch[0];
        if (schemaText.includes('type: object') || schemaText.includes('properties:')) {
          if (schemaText.includes('url:')) {
            return 'url_object';
          } else if (schemaText.includes('path:')) {
            return 'path_object';
          }
        }
      }
    } catch (e: any) {
      logger.warn(`Could not fetch Resolume swagger definitions, defaulting to string payload: ${e.message}`);
    }
    return 'string';
  }

  /**
   * Loads local media file into specific clip slot inside Resolume
   */
  async loadMedia(absolutePath: string, layerIndex = this.defaultLayer, clipIndex = this.defaultClip): Promise<boolean> {
    if (!this.enabled) {
      logger.info('Resolume integration is disabled. Skipping loadMedia.');
      return false;
    }

    const fileUrl = this.formatFileUrl(absolutePath);
    logger.info(`[Resolume] Loading media file url: ${fileUrl} into Layer ${layerIndex}, Clip ${clipIndex}...`);

    try {
      // 1. Detect openfile body schema
      const schemaType = await this.detectFileUrlSchema();
      let body: any;

      if (schemaType === 'url_object') {
        body = { url: fileUrl };
      } else if (schemaType === 'path_object') {
        body = { path: fileUrl };
      } else {
        body = fileUrl; // String raw payload
      }

      // 2. Load file into slot
      const endpoint = `/composition/layers/${layerIndex}/clips/${clipIndex}/openfile`;
      await this.client.post(endpoint, body, {
        headers: {
          'Content-Type': typeof body === 'object' ? 'application/json' : 'text/plain',
        },
      });

      logger.info(`[Resolume] Successfully loaded file into Layer ${layerIndex}, Clip ${clipIndex}`);
      return true;
    } catch (error: any) {
      logger.error(`[Resolume] Failed to load media to clip: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }

  /**
   * Connect / Trigger clip playback to display it on outputs.
   */
  async triggerClip(layerIndex = this.defaultLayer, clipIndex = this.defaultClip): Promise<boolean> {
    if (!this.enabled) return false;
    logger.info(`[Resolume] Triggering playback of Clip ${clipIndex} inside Layer ${layerIndex}...`);

    try {
      const endpoint = `/composition/layers/${layerIndex}/clips/${clipIndex}/connect`;
      // Send connect request to boot clip on screen
      await this.client.post(endpoint, {});
      logger.info(`[Resolume] Playback triggered successfully on LED screen.`);
      return true;
    } catch (error: any) {
      logger.error(`[Resolume] Failed to trigger clip: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }
}

export const resolumeService = new ResolumeService();
export default resolumeService;
