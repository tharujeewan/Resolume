import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';

// Import Pages (To be created in subsequent steps)
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventForm from './pages/EventForm';
import Moderation from './pages/Moderation';
import Gallery from './pages/Gallery';
import GuestUpload from './pages/GuestUpload';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard component to protect route parameters
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-indigo-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/e/:slug" element={<GuestUpload />} />
              <Route path="/events/:id/gallery" element={<Gallery />} />

              {/* Protected Organizer & Admin Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'SUPER_ADMIN']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'SUPER_ADMIN']}>
                    <Events />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/new"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'SUPER_ADMIN']}>
                    <EventForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'SUPER_ADMIN']}>
                    <EventForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:id/moderation"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'SUPER_ADMIN']}>
                    <Moderation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'SUPER_ADMIN']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Super Admin Restricted Route */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />

              {/* fallback 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
