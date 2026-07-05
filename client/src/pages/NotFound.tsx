import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-6 text-center select-none relative overflow-hidden">
      <div className="absolute w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      
      <div className="flex flex-col gap-6 max-w-sm items-center">
        <HelpCircle className="w-16 h-16 text-indigo-400 animate-bounce" />
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">404</h1>
          <h2 className="text-lg font-bold text-slate-350 mt-1">Page Not Found</h2>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            The page you are looking for does not exist, has been removed, or is temporarily unavailable.
          </p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition-all mt-4"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
