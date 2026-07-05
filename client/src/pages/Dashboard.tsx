import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar, Image as ImageIcon, CheckCircle, Clock, XCircle, HardDrive } from 'lucide-react';

interface StatsResponse {
  totalEvents: number;
  totalUploads: number;
  stats: {
    approved: number;
    pending: number;
    rejected: number;
    deleted: number;
  };
  storageUsedBytes: number;
  recentActivity: Array<{
    id: string;
    originalName: string;
    thumbnailFilename: string;
    status: string;
    size: number;
    createdAt: string;
    event: {
      name: string;
      slug: string;
    };
  }>;
}

export const Dashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery<StatsResponse>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
    refetchInterval: 15000, // Auto refresh every 15s
  });

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="bg-red-950/20 border border-red-500/20 text-red-400 p-4 rounded-xl">
          Failed to load dashboard metrics. Please reload the page.
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { label: 'Total Events', value: data.totalEvents, icon: Calendar, color: 'text-indigo-400', bg: 'bg-indigo-950/30' },
    { label: 'Total Uploads', value: data.totalUploads, icon: ImageIcon, color: 'text-purple-400', bg: 'bg-purple-950/30' },
    { label: 'Approved Photos', value: data.stats.approved, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-950/30' },
    { label: 'Pending Moderation', value: data.stats.pending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-950/30' },
    { label: 'Rejected Photos', value: data.stats.rejected, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-950/30' },
    { label: 'Storage Footprint', value: formatStorage(data.storageUsedBytes), icon: HardDrive, color: 'text-sky-400', bg: 'bg-sky-950/30' },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time status of your photo galleries and events</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="p-6 rounded-2xl glass border border-slate-900 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{card.label}</span>
                  <span className="text-2xl font-bold text-slate-100">{card.value}</span>
                </div>
                <div className={`p-3.5 rounded-xl border border-slate-800/50 ${card.bg}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity List */}
        <div className="glass border border-slate-900 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Recent Uploads</h2>
          {data.recentActivity.length === 0 ? (
            <div className="text-slate-500 text-sm py-8 text-center">
              No photos have been uploaded yet. Publish an event and share the link to see them here!
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-900">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <img
                      src={`/uploads/${activity.thumbnailFilename}`}
                      alt={activity.originalName}
                      className="w-12 h-12 object-cover rounded-lg border border-slate-800/80 bg-slate-900"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate max-w-xs">{activity.originalName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Uploaded to <span className="text-slate-400 font-medium">{activity.event.name}</span> •{' '}
                        {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-1 rounded-full border ${
                        activity.status === 'APPROVED'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                          : activity.status === 'PENDING'
                          ? 'bg-yellow-950/40 text-yellow-400 border-yellow-500/20'
                          : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
