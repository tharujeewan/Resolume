import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Calendar,
  Settings as SettingsIcon,
  Shield,
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  if (user?.role === 'SUPER_ADMIN') {
    navigation.push({ name: 'Admin Panel', href: '/admin', icon: Shield });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Static Sidebar for Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 glass border-r border-slate-800/80">
        <div className="flex items-center h-16 px-6 border-b border-slate-800/80">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              EventWall
            </span>
            <span className="text-[10px] uppercase tracking-widest bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
              SaaS
            </span>
          </Link>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 shadow-md shadow-indigo-500/5'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/20">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-950 border border-indigo-500/20 text-indigo-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
              </p>
              <p className="text-[10px] text-slate-500 truncate uppercase font-mono font-bold tracking-wider">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 glass border-r border-slate-800/80 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800/80">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              EventWall
            </span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-slate-200">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 shadow-md shadow-indigo-500/5'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 bg-slate-900/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 hover:bg-red-950/20 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-16 px-6 border-b border-slate-900/80 glass-premium/10 md:justify-end">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-200 md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Gateway Connected
            </span>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
