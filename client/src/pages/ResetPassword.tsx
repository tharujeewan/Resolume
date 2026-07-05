import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast('error', 'Token is missing from URL');
      return;
    }

    if (password.length < 8) {
      toast('error', 'Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast('error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      toast('success', 'Password reset successfully!');
    } catch (error: any) {
      toast('error', error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-6 relative overflow-hidden">
      <div className="absolute w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="w-full max-w-md glass-premium p-8 rounded-2xl flex flex-col gap-6 shadow-2xl relative">
        <div className="text-center">
          <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            EventWall
          </Link>
          <h2 className="text-2xl font-bold mt-4">Reset Password</h2>
          <p className="text-slate-400 text-sm mt-1.5">Enter your new secure password</p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 mt-2"
            >
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div className="text-center flex flex-col gap-4 items-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 animate-bounce" />
            <p className="text-sm text-slate-300">
              Your password has been updated. You can now log in using your new credentials.
            </p>
            <Link
              to="/login"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-sm font-semibold text-center transition-all duration-200 block"
            >
              Sign In
            </Link>
          </div>
        )}

        {!success && (
          <div className="text-center border-t border-slate-850 pt-4 mt-2">
            <Link to="/login" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
