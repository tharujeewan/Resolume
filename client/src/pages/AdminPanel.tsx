import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { useToast } from '../components/Toast';
import { Shield, Trash2 } from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  createdAt: string;
  role: {
    name: 'SUPER_ADMIN' | 'ORGANIZER' | 'GUEST';
  };
}

interface ActivityLogItem {
  id: string;
  action: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    email: string;
  };
}

export const AdminPanel: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'USERS' | 'LOGS'>('USERS');

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<UserItem[]>({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    },
    enabled: activeSubTab === 'USERS',
  });

  // Fetch activity logs
  const { data: logs, isLoading: logsLoading } = useQuery<ActivityLogItem[]>({
    queryKey: ['adminLogs'],
    queryFn: async () => {
      const res = await api.get('/admin/logs');
      return res.data;
    },
    enabled: activeSubTab === 'LOGS',
  });

  // Role modification mutation
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'SUPER_ADMIN' | 'ORGANIZER' }) => {
      await api.patch(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast('success', 'User role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (err: any) => {
      toast('error', err.response?.data?.message || 'Failed to update user role');
    },
  });

  // User delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast('success', 'User account deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (err: any) => {
      toast('error', err.response?.data?.message || 'Failed to delete user');
    },
  });

  const handleToggleRole = (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'SUPER_ADMIN' ? 'ORGANIZER' : 'SUPER_ADMIN';
    if (window.confirm(`Are you sure you want to change user role to ${nextRole}?`)) {
      roleMutation.mutate({ userId, role: nextRole });
    }
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (window.confirm(`Are you sure you want to delete user account "${email}"? This will delete all their events.`)) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8 text-indigo-400" /> System Admin
          </h1>
          <p className="text-slate-400 text-sm mt-1">Super administrator panels for operations and auditing</p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-slate-900 pb-px">
          <button
            onClick={() => setActiveSubTab('USERS')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeSubTab === 'USERS'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Manage Users
          </button>
          <button
            onClick={() => setActiveSubTab('LOGS')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeSubTab === 'LOGS'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Audit Logs
          </button>
        </div>

        {/* User management list */}
        {activeSubTab === 'USERS' && (
          <div className="glass border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
            {usersLoading ? (
              <div className="p-8 text-center text-indigo-400 animate-pulse">Loading users...</div>
            ) : !users || users.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-900">
                      <th className="p-4 pl-6">Email / Name</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Verification</th>
                      <th className="p-4">Date Joined</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-sm">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/20">
                        <td className="p-4 pl-6">
                          <p className="font-semibold text-slate-200">{u.email}</p>
                          {u.firstName && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {u.firstName} {u.lastName}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-mono bg-slate-900 border border-slate-800 text-slate-350 px-2 py-0.5 rounded">
                            {u.role.name}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              u.isVerified ? 'bg-emerald-950/40 text-emerald-400' : 'bg-yellow-950/40 text-yellow-400'
                            }`}
                          >
                            {u.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-550">
                          {new Date(u.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleToggleRole(u.id, u.role.name)}
                              className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Toggle Role
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="text-xs bg-slate-900 border border-slate-800 hover:bg-red-950/20 hover:border-red-900/30 text-slate-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Audit Log list */}
        {activeSubTab === 'LOGS' && (
          <div className="glass border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
            {logsLoading ? (
              <div className="p-8 text-center text-indigo-400 animate-pulse">Loading system log files...</div>
            ) : !logs || logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No activity logs recorded.</div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-900 max-h-[60vh] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 px-6 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{log.action}</p>
                      {log.details && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{log.details}</p>}
                      <p className="text-[10px] text-slate-500 mt-1">
                        By: <span className="text-slate-450">{log.user?.email || 'System'}</span> • IP: {log.ipAddress || 'unknown'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-550 shrink-0 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPanel;
