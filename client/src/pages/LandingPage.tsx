import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, MonitorPlay, Zap, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              EventWall
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all duration-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Real-time photo walls for{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            live events.
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl font-normal leading-relaxed">
          Engage your guests instantly. Guests scan a QR code, upload photos from their phones, and see them appear live on screen in seconds.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            to="/signup"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold shadow-xl shadow-indigo-600/10 hover:shadow-indigo-500/25 transition-all duration-200"
          >
            Create Your Event Wall <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-300 hover:text-white px-8 py-4 rounded-xl font-semibold transition-all"
          >
            Dashboard
          </Link>
        </div>

        {/* Feature Dashboard Preview mockup */}
        <div className="mt-20 w-full max-w-5xl rounded-2xl overflow-hidden glass border border-slate-800 shadow-2xl p-2 animate-fade-in">
          <div className="bg-slate-950/60 rounded-xl p-6 border border-slate-900 flex flex-col gap-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/40" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/40" />
                <span className="w-3 h-3 rounded-full bg-green-500/40" />
              </div>
              <span className="text-xs text-slate-600 font-mono">dashboard_live_preview.png</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-850">
                <span className="text-xs text-slate-500 font-semibold uppercase">Pending Moderation</span>
                <p className="text-3xl font-bold mt-1 text-yellow-400">14</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-850">
                <span className="text-xs text-slate-500 font-semibold uppercase">Approved & Displayed</span>
                <p className="text-3xl font-bold mt-1 text-emerald-400">382</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-850">
                <span className="text-xs text-slate-500 font-semibold uppercase">Active Uploaders</span>
                <p className="text-3xl font-bold mt-1 text-indigo-400">92</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center tracking-tight">
          Built for modern production setups
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="p-8 rounded-2xl glass-premium text-left">
            <Zap className="w-10 h-10 text-indigo-400" />
            <h3 className="text-xl font-bold mt-6">Instant Real-time Sync</h3>
            <p className="mt-3 text-slate-400 leading-relaxed">
              Powered by WebSockets. Photos upload and display in real time without refreshing the page.
            </p>
          </div>
          <div className="p-8 rounded-2xl glass-premium text-left">
            <MonitorPlay className="w-10 h-10 text-purple-400" />
            <h3 className="text-xl font-bold mt-6">Resolume Arena Ready</h3>
            <p className="mt-3 text-slate-400 leading-relaxed">
              Approved photos are synced instantly into local folders. Resolume watches this directory for immediate VJ mixing.
            </p>
          </div>
          <div className="p-8 rounded-2xl glass-premium text-left">
            <ShieldAlert className="w-10 h-10 text-pink-400" />
            <h3 className="text-xl font-bold mt-6">Robust Moderation</h3>
            <p className="mt-3 text-slate-400 leading-relaxed">
              Keep the display clean. Approve, reject, delete, or bulk moderate photos from the dashboard instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-10 px-6 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} EventWall. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
