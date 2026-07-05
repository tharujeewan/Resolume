import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export const useSocket = (eventId: string | undefined, roomType: 'display' | 'moderation' | null, handlers: { [key: string]: (data: any) => void }) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!eventId) return;

    // Establish WebSocket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server:', socket.id);
      
      // Join appropriate room
      if (roomType === 'display') {
        socket.emit('join_event', eventId);
      } else if (roomType === 'moderation') {
        socket.emit('join_moderation', eventId);
      }
    });

    // Set dynamic event listeners
    Object.entries(handlers).forEach(([eventName, handler]) => {
      socket.on(eventName, handler);
    });

    return () => {
      // Leave rooms and disconnect
      if (socketRef.current) {
        if (roomType === 'display') {
          socketRef.current.emit('leave_event', eventId);
        } else if (roomType === 'moderation') {
          socketRef.current.emit('leave_moderation', eventId);
        }
        socketRef.current.disconnect();
      }
    };
  }, [eventId, roomType, JSON.stringify(Object.keys(handlers))]);

  return socketRef.current;
};

export default useSocket;
