import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { useToast } from '../components/Toast';
import {
  Calendar,
  MapPin,
  Clock,
  Settings as EditIcon,
  Shield,
  Trash2,
  Plus,
  Tv,
} from 'lucide-react';

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  date: string;
  venue?: string;
  startTime?: string;
  endTime?: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  theme: string;
  maxUploadLimit: number;
  createdAt: string;
}

export const Events: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await api.get('/events');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${id}`);
    },
    onSuccess: () => {
      toast('success', 'Event deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err: any) => {
      toast('error', err.response?.data?.message || 'Failed to delete event');
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action is permanent and deletes all photos.`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] w-full items-center justify-center text-indigo-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !events) {
    return (
      <DashboardLayout>
        <div className="bg-red-950/20 border border-red-500/20 text-red-400 p-4 rounded-xl">
          Failed to fetch events list. Please reload the page.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Events</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your active, draft, and archived event photo walls</p>
          </div>
          <Link
            to="/events/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/25 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="glass border border-slate-900 rounded-2xl p-12 text-center flex flex-col items-center gap-4">
            <Calendar className="w-12 h-12 text-slate-500" />
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-slate-200">No events found</h3>
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                Get started by creating your first photo wall. It takes less than a minute.
              </p>
            </div>
            <Link
              to="/events/new"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all mt-2"
            >
              Launch First Event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <div key={event.id} className="p-6 rounded-2xl glass border border-slate-900 flex flex-col gap-6 relative shadow-md">
                {/* Event header info */}
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-slate-100 truncate">{event.name}</h3>
                    <span className="text-xs text-indigo-400 font-semibold font-mono">/e/{event.slug}</span>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-1 rounded-full border shrink-0 ${
                      event.status === 'ACTIVE'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                        : event.status === 'DRAFT'
                        ? 'bg-yellow-950/40 text-yellow-400 border-yellow-500/20'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {event.status}
                  </span>
                </div>

                {/* Event details metadata */}
                <div className="flex flex-col gap-2 text-xs text-slate-400 border-b border-slate-900 pb-5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
                    <span>{new Date(event.date).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0 text-slate-500" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  )}
                  {(event.startTime || event.endTime) && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>
                        {event.startTime || 'Start'} - {event.endTime || 'End'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-auto">
                  <div className="flex gap-2">
                    <Link
                      to={`/events/${event.id}/moderation`}
                      className="flex items-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/25 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                    >
                      <Shield className="w-4 h-4" />
                      Moderate
                    </Link>
                    <Link
                      to={`/events/${event.id}/gallery`}
                      target="_blank"
                      className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                    >
                      <Tv className="w-4 h-4" />
                      LED Wall
                    </Link>
                  </div>

                  <div className="flex gap-1">
                    <Link
                      to={`/events/${event.id}/edit`}
                      className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                      title="Edit Event"
                    >
                      <EditIcon className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(event.id, event.name)}
                      className="p-2 bg-slate-900 border border-slate-800 hover:bg-red-950/20 hover:border-red-900/30 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Events;
