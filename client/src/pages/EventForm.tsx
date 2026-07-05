import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { useToast } from '../components/Toast';
import { ArrowLeft, Save, Download, Globe, FileText, QrCode } from 'lucide-react';

interface EventFormValues {
  name: string;
  slug: string;
  description: string;
  date: string;
  venue: string;
  startTime: string;
  endTime: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  theme: string;
  maxUploadLimit: number;
}

export const EventForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState<EventFormValues>({
    name: '',
    slug: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    venue: '',
    startTime: '',
    endTime: '',
    status: 'DRAFT',
    theme: 'dark',
    maxUploadLimit: 200,
  });

  // Fetch event details if editing
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const res = await api.get(`/events/${id}`);
      return res.data;
    },
    enabled: isEdit,
  });

  // Prefill form
  useEffect(() => {
    if (event) {
      setForm({
        name: event.name || '',
        slug: event.slug || '',
        description: event.description || '',
        date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
        venue: event.venue || '',
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        status: event.status || 'DRAFT',
        theme: event.theme || 'dark',
        maxUploadLimit: event.maxUploadLimit || 200,
      });
    }
  }, [event]);

  // Auto generate slug from event name (only for new events)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nameVal = e.target.value;
    setForm((prev) => {
      const updates: Partial<EventFormValues> = { name: nameVal };
      if (!isEdit) {
        updates.slug = nameVal
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // remove special chars
          .replace(/\s+/g, '-') // replace spaces with dashes
          .replace(/-+/g, '-'); // trim double dashes
      }
      return { ...prev, ...updates };
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slugVal = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setForm((prev) => ({ ...prev, slug: slugVal }));
  };

  const mutation = useMutation({
    mutationFn: async (values: EventFormValues) => {
      if (isEdit) {
        return (await api.put(`/events/${id}`, values)).data;
      } else {
        return (await api.post('/events', values)).data;
      }
    },
    onSuccess: () => {
      toast('success', `Event ${isEdit ? 'updated' : 'created'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    },
    onError: (err: any) => {
      toast('error', err.response?.data?.message || 'Failed to save event details');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.date) {
      toast('error', 'Please fill in name, slug and event date');
      return;
    }
    mutation.mutate(form);
  };

  const handleDownloadQR = async (format: 'png' | 'svg' | 'pdf') => {
    if (!id) return;
    try {
      const response = await api.get(`/events/${id}/qr`, {
        params: { format },
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] as string,
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const ext = format === 'pdf' ? 'pdf' : format === 'svg' ? 'svg' : 'png';
      link.setAttribute('download', `qrcode-${event?.slug || 'event'}.${ext}`);
      
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast('success', 'File downloaded successfully');
    } catch (err) {
      toast('error', 'Failed to download QR file');
    }
  };

  if (isEdit && isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] w-full items-center justify-center text-indigo-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/events" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{isEdit ? 'Edit Event' : 'Create Event'}</h1>
            <p className="text-slate-400 text-sm mt-1">Configure your screen, uploads limit, and link attributes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Area */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 flex flex-col gap-6 glass border border-slate-900 p-6 rounded-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Event Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Sarah & Michael Wedding"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">URL Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={handleSlugChange}
                  placeholder="e.g. sarah-michael-wedding"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  disabled={isEdit}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Give your guests some context on what to snap and share..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Start Time</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">End Time</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Venue</label>
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                  placeholder="e.g. Grand Plaza Ballroom"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Max Photo Upload Limit</label>
                <input
                  type="number"
                  value={form.maxUploadLimit}
                  onChange={(e) => setForm((p) => ({ ...p, maxUploadLimit: parseInt(e.target.value, 10) }))}
                  placeholder="200"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active (Accepting Uploads)</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">LED Display Theme</label>
                <select
                  value={form.theme}
                  onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="dark">Sleek Dark Grid</option>
                  <option value="light">Classic Light</option>
                  <option value="glass">Neon Glassmorphic Collage</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-all mt-4 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {mutation.isPending ? 'Saving changes...' : 'Save Settings'}
            </button>
          </form>

          {/* QR and share panel */}
          {isEdit && (
            <div className="flex flex-col gap-6 glass border border-slate-900 p-6 rounded-2xl text-center items-center justify-center">
              <QrCode className="w-12 h-12 text-indigo-400" />
              <div>
                <h3 className="text-lg font-bold">Event QR Flyers</h3>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  Download high quality prints or print vector formats to display at tables or screens.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full border-t border-slate-900 pt-5 mt-2">
                <button
                  onClick={() => handleDownloadQR('png')}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg py-2.5 text-sm font-semibold transition-all"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  Download PNG
                </button>
                <button
                  onClick={() => handleDownloadQR('svg')}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg py-2.5 text-sm font-semibold transition-all"
                >
                  <Globe className="w-4 h-4 text-slate-500" />
                  Download SVG
                </button>
                <button
                  onClick={() => handleDownloadQR('pdf')}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 rounded-lg py-2.5 text-sm font-semibold transition-all"
                >
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Download Flyer PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EventForm;
