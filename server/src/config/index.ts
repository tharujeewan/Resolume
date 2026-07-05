import path from 'path';
import dotenv from 'dotenv';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config(); // fallback to server/.env if present

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/eventwall?schema=public',
  jwt: {
    secret: process.env.JWT_SECRET || 'eventwall_jwt_secret_key_change_me_in_prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'eventwall_jwt_refresh_secret_key_change_me_in_prod',
    accessExpirationMinutes: parseInt(process.env.JWT_ACCESS_EXPIRATION_MINUTES || '15', 10),
    refreshExpirationDays: parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS || '7', 10),
  },
  uploads: {
    // Save in root workspace dir /uploads
    baseDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../../../uploads')),
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB in bytes
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'],
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    from: process.env.EMAIL_FROM || 'noreply@eventwall.com',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Default Vite port
  },
  resolume: {
    enabled: process.env.RESOLUME_ENABLED === 'true',
    host: process.env.RESOLUME_HOST || 'localhost',
    port: parseInt(process.env.RESOLUME_PORT || '8080', 10),
    layer: parseInt(process.env.RESOLUME_LAYER || '1', 10),
    clip: parseInt(process.env.RESOLUME_CLIP || '1', 10),
  },
};
