import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import { useToast } from '../components/Toast';
import DashboardLayout from '../components/DashboardLayout';
import {
  Check,
  X,
  Trash2,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react';

interface Photo {
  id: string;
  originalName: string;
  filename: string;
  thumbnailFilename: string;
  optimizedFilename: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  size: number;
  createdAt: string;
}

export const Moderation: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch Event details
  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}`);
      return res.data;
    },
    enabled: !!eventId,
  });

  // Fetch photos for the selected status tab
  const { data: photoData, isLoading, refetch } = useQuery<{ photos: Photo[] }>({
    queryKey: ['photos', eventId, activeTab],
    queryFn: async () => {
      const res = await api.get('/photos', {
        params: {
          eventId,
          status: activeTab,
          limit: 100, // get a reasonable chunk of images
        },
      });
      return res.data;
    },
    enabled: !!eventId,
  });

  // Register real-time Socket.io updates for moderation room
  useSocket(eventId, 'moderation', {
    photo_uploaded: (newPhoto: Photo) => {
      console.log('Realtime photo uploaded:', newPhoto);
      // Invalidate query to pull the latest list
      queryClient.invalidateQueries({ queryKey: ['photos', eventId, 'PENDING'] });
      toast('info', `New photo uploaded: ${newPhoto.originalName}`);
    },
    photo_status_changed: (payload: { photoId: string; status: string }) => {
      console.log('Realtime status update:', payload);
      queryClient.invalidateQueries({ queryKey: ['photos', eventId] });
    },
    bulk_status_changed: (payload: { photoIds: string[]; status: string }) => {
      console.log('Realtime bulk status update:', payload);
      queryClient.invalidateQueries({ queryKey: ['photos', eventId] });
      setSelectedIds([]);
    },
  });

  // Mutation to update photo status
  const statusMutation = useMutation({
    mutationFn: async ({ photoId, status }: { photoId: string; status: 'APPROVED' | 'REJECTED' | 'DELETED' }) => {
      await api.patch(`/photos/${photoId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      toast('success', `Photo successfully marked as ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['photos', eventId] });
    },
    onError: (err: any) => {
      toast('error', err.response?.data?.message || 'Failed to update photo status');
    },
  });

  // Bulk update mutation
  const bulkMutation = useMutation({
    mutationFn: async ({ photoIds, status }: { photoIds: string[]; status: 'APPROVED' | 'REJECTED' }) => {
      await api.post('/photos/bulk-status', { photoIds, status, eventId });
    },
    onSuccess: (_, variables) => {
      toast('success', `Successfully processed ${variables.photoIds.length} photos`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['photos', eventId] });
    },
    onError: (err: any) => {
      toast('error', err.response?.data?.message || 'Failed to complete bulk action');
    },
  });

  const handleSingleModerate = (photoId: string, status: 'APPROVED' | 'REJECTED' | 'DELETED') => {
    statusMutation.mutate({ photoId, status });
  };

  const handleBulkAction = (status: 'APPROVED' | 'REJECTED') => {
    if (selectedIds.length === 0) return;
    bulkMutation.mutate({ photoIds: selectedIds, status });
  };

  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const toggleSelectAll = () => {
    const photos = photoData?.photos || [];
    if (selectedIds.length === photos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.map((p) => p.id));
    }
  };

  // Filter photos based on search string
  const filteredPhotos =
    photoData?.photos.filter((photo) =>
      photo.originalName.toLowerCase().includes(search.toLowerCase())
    ) || [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-5">
          <div className="flex items-center gap-3">
            <Link to="/events" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{event?.name || 'Moderation'}</h1>
              <p className="text-slate-400 text-xs mt-0.5">Real-time moderator console</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search filenames..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-60 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              title="Refresh list"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Row & Bulk tools header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-1.5 p-1 rounded-xl bg-slate-900/50 border border-slate-900">
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedIds([]);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {filteredPhotos.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {selectedIds.length === filteredPhotos.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-400" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Select All
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex h-60 items-center justify-center text-indigo-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent"></div>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="glass border border-slate-900 rounded-2xl p-16 text-center flex flex-col items-center gap-3">
            <ImageIcon className="w-10 h-10 text-slate-600" />
            <h3 className="text-slate-300 font-semibold text-sm">No photos found</h3>
            <p className="text-slate-500 text-xs max-w-xs">
              {search
                ? 'Try adjusting your search filter.'
                : `There are currently no photos in the ${activeTab.toLowerCase()} list.`}
            </p>
          </div>
        ) : (
          /* Photos Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredPhotos.map((photo) => {
              const isSelected = selectedIds.includes(photo.id);
              return (
                <div
                  key={photo.id}
                  onClick={() => toggleSelect(photo.id)}
                  className={`group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-900 hover:border-slate-800'
                  }`}
                >
                  <img
                    src={`/uploads/${photo.thumbnailFilename}`}
                    alt={photo.originalName}
                    className="w-full h-full object-cover select-none"
                  />

                  {/* Multi-select checkmark indicator */}
                  <div className="absolute top-2 left-2 z-10">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950/60 border-slate-700 text-transparent opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Action overlays on hover */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 gap-2"
                    onClick={(e) => e.stopPropagation()} // Stop toggleSelect when clicking overlays
                  >
                    <p className="text-[10px] text-slate-300 truncate select-none">{photo.originalName}</p>
                    
                    <div className="flex gap-1.5 w-full">
                      {activeTab !== 'APPROVED' && (
                        <button
                          onClick={() => handleSingleModerate(photo.id, 'APPROVED')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg flex items-center justify-center transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {activeTab !== 'REJECTED' && (
                        <button
                          onClick={() => handleSingleModerate(photo.id, 'REJECTED')}
                          className="flex-1 bg-rose-600/90 hover:bg-rose-500 text-white p-1.5 rounded-lg flex items-center justify-center transition-colors"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleSingleModerate(photo.id, 'DELETED')}
                        className="bg-slate-900 border border-slate-800 hover:bg-red-950 hover:text-red-400 hover:border-red-900/30 text-slate-400 p-1.5 rounded-lg flex items-center justify-center transition-colors"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-slate-800 shadow-2xl px-6 py-3 rounded-2xl flex items-center gap-4 animate-fade-in glass-premium">
            <span className="text-xs font-semibold text-slate-300 font-mono">
              {selectedIds.length} photo{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              {activeTab !== 'APPROVED' && (
                <button
                  onClick={() => handleBulkAction('APPROVED')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
              )}
              {activeTab !== 'REJECTED' && (
                <button
                  onClick={() => handleBulkAction('REJECTED')}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              )}
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-450 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Moderation;
