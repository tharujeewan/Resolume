import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { config } from '../config';

class SocketService {
  private io: SocketIOServer | null = null;

  init(server: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket client connected: ${socket.id}`);

      // Join event-specific display wall room
      socket.on('join_event', (eventId: string) => {
        socket.join(`event_${eventId}`);
        logger.info(`Socket ${socket.id} joined room event_${eventId}`);
      });

      // Leave event-specific room
      socket.on('leave_event', (eventId: string) => {
        socket.leave(`event_${eventId}`);
        logger.info(`Socket ${socket.id} left room event_${eventId}`);
      });

      // Join event moderation room
      socket.on('join_moderation', (eventId: string) => {
        socket.join(`event_${eventId}_moderation`);
        logger.info(`Socket ${socket.id} joined room event_${eventId}_moderation`);
      });

      // Leave event moderation room
      socket.on('leave_moderation', (eventId: string) => {
        socket.leave(`event_${eventId}_moderation`);
        logger.info(`Socket ${socket.id} left room event_${eventId}_moderation`);
      });

      socket.on('disconnect', () => {
        logger.info(`Socket client disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.io not initialized. Call init(server) first.');
    }
    return this.io;
  }

  // Notify clients viewing the photo wall
  notifyPhotoApproved(eventId: string, photo: any) {
    if (this.io) {
      this.io.to(`event_${eventId}`).emit('photo_approved', photo);
      logger.info(`Socket: Sent photo_approved to event_${eventId}`);
    }
  }

  // Notify organizers that a new photo needs moderation
  notifyPhotoUploaded(eventId: string, photo: any) {
    if (this.io) {
      this.io.to(`event_${eventId}_moderation`).emit('photo_uploaded', photo);
      // Also send a general count updates trigger to dashboards
      this.io.to(`event_${eventId}_moderation`).emit('dashboard_update', { eventId });
      logger.info(`Socket: Sent photo_uploaded and dashboard_update to event_${eventId}_moderation`);
    }
  }

  // Notify organizers of photo status edits
  notifyPhotoStatusChanged(eventId: string, payload: { photoId: string; status: string }) {
    if (this.io) {
      this.io.to(`event_${eventId}_moderation`).emit('photo_status_changed', payload);
      this.io.to(`event_${eventId}`).emit('photo_status_changed', payload);
      logger.info(`Socket: Sent photo_status_changed to room event_${eventId} & moderation`);
    }
  }

  // Notify organizers of bulk actions
  notifyBulkStatusChanged(eventId: string, payload: { photoIds: string[]; status: string }) {
    if (this.io) {
      this.io.to(`event_${eventId}_moderation`).emit('bulk_status_changed', payload);
      this.io.to(`event_${eventId}`).emit('bulk_status_changed', payload);
      logger.info(`Socket: Sent bulk_status_changed to room event_${eventId} & moderation`);
    }
  }
}

export const socketService = new SocketService();
export default socketService;
