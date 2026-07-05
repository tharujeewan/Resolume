import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, ApiError } from './middlewares/error';
import { apiLimiter } from './middlewares/rateLimiter';
import routesV1 from './routes/v1';
import socketService from './services/socket.service';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

// Security Headers (Configure Helmet to allow loading of local image assets in CORS/webpages)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS setup
app.use(
  cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files statically
// Files can be retrieved via e.g., http://localhost:5000/uploads/events/...
app.use('/uploads', express.static(config.uploads.baseDir));

// Logging Request metadata in dev
if (config.env === 'development') {
  app.use((req, res, next) => {
    logger.http(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// API Routes (version 1)
app.use('/api/v1', apiLimiter, routesV1);

// Send 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, 'API endpoint not found'));
});

// Global error handler middleware
app.use(errorHandler);

// Start server
server.listen(config.port, () => {
  logger.info(`=================================`);
  logger.info(`  Server running in ${config.env} mode`);
  logger.info(`  Listening on port: ${config.port}`);
  logger.info(`  Uploads directory: ${config.uploads.baseDir}`);
  logger.info(`=================================`);
});

// Handle graceful shutdown
const gracefulShutdown = () => {
  logger.info('Shutting down server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
