import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { Mail, ArrowLeft, Send } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast('error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast('success', 'Reset link sent successfully!');
    } catch (error: any) {
      toast('error', error.response?.data?.message || 'Failed to send reset link');
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
          <h2 className="text-2xl font-bold mt-4">Forgot Password</h2>
          <p className="text-slate-400 text-sm mt-1.5">We will send a reset password link to your email</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
              {loading ? 'Sending link...' : 'Send Reset Link'}
              <Send className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="text-center bg-slate-900/50 p-4 rounded-xl border border-slate-850">
            <p className="text-sm text-slate-300">
              An email has been sent to <strong>{email}</strong> with details on how to reset your password.
            </p>
          </div>
        )}

        <div className="text-center border-t border-slate-850 pt-4 mt-2">
          <Link to="/login" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
