import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import { Maximize2, Minimize2, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Photo {
  id: string;
  filename: string;
  optimizedFilename: string;
  createdAt: string;
}

export const Gallery: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newPhotoOverlay, setNewPhotoOverlay] = useState<Photo | null>(null);

  // Fetch Event metadata
  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}`);
      return res.data;
    },
    enabled: !!eventId,
  });

  // Fetch approved photos
  const { isLoading } = useQuery({
    queryKey: ['photos', eventId, 'APPROVED'],
    queryFn: async () => {
      const res = await api.get('/photos', {
        params: {
          eventId,
          status: 'APPROVED',
          limit: 100,
        },
      });
      setPhotos(res.data.photos);
      return res.data;
    },
    enabled: !!eventId,
  });

  // Real-time photo stream
  useSocket(eventId, 'display', {
    photo_approved: (newPhoto: Photo) => {
      console.log('Live photo approved:', newPhoto);
      // Prepend to photo stream
      setPhotos((prev) => [newPhoto, ...prev]);

      // Trigger beautiful animation overlay
      setNewPhotoOverlay(newPhoto);

      // Trigger celebratory confetti on screen!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981'],
      });
    },
    photo_status_changed: (payload: { photoId: string; status: string }) => {
      if (payload.status !== 'APPROVED') {
        // Remove if un-approved / deleted
        setPhotos((prev) => prev.filter((p) => p.id !== payload.photoId));
      }
    },
    bulk_status_changed: (payload: { photoIds: string[]; status: string }) => {
      if (payload.status !== 'APPROVED') {
        setPhotos((prev) => prev.filter((p) => !payload.photoIds.includes(p.id)));
      }
    },
  });

  // Automatically dismiss the new photo overlay after 6 seconds
  useEffect(() => {
    if (newPhotoOverlay) {
      const timer = setTimeout(() => {
        setNewPhotoOverlay(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [newPhotoOverlay]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-indigo-500">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans select-none">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px] -z-10" />

      {/* Floating control bar */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="glass px-4 py-2.5 rounded-full flex items-center gap-3 border border-white/5 pointer-events-auto shadow-xl">
          <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {event?.name || 'Event Gallery'}
          </span>
          <div className="h-3 w-px bg-slate-800" />
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Screen
          </span>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-2.5 rounded-full glass border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-100 pointer-events-auto transition-all shadow-xl"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </header>

      {/* Grid gallery */}
      <main className="flex-1 p-6 pt-24 overflow-y-auto">
        {photos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
            <ImageIcon className="w-16 h-16 text-slate-700 animate-pulse" />
            <p className="text-lg font-semibold text-slate-400">Waiting for guest photos...</p>
            <p className="text-xs max-w-xs text-center leading-relaxed">
              Photos uploaded by guests will instantly slide in here once approved by moderators.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square rounded-2xl overflow-hidden glass border border-slate-900 shadow-lg relative transform hover:scale-[1.02] transition-transform duration-300 animate-fade-in"
              >
                <img
                  src={`/${photo.optimizedFilename}`}
                  alt="Guest upload"
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Realtime Announcement Overlay (Triggered when new photo arrives) */}
      {newPhotoOverlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 transition-all duration-500 ease-in-out animate-fade-in">
          <div className="max-w-2xl w-full flex flex-col items-center gap-6">
            <div className="glass px-6 py-2 rounded-full border border-indigo-500/30 text-indigo-400 text-sm font-bold tracking-widest uppercase animate-pulse">
              New Photo Added!
            </div>
            
            <div className="aspect-[4/3] max-h-[60vh] w-full rounded-3xl overflow-hidden shadow-2xl border-2 border-indigo-500/20 glass p-2 relative bg-slate-900/40">
              <img
                src={`/${newPhotoOverlay.optimizedFilename}`}
                alt="New photo display"
                className="w-full h-full object-contain rounded-2xl"
              />
            </div>
            
            <p className="text-slate-400 text-xs italic tracking-wide">
              Uploading now to {event?.name}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
