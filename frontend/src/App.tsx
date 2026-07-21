import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AdminProvider } from './context/AdminContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { AlertTriangle } from 'lucide-react';

// Lazy load all page components
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Staking = lazy(() => import('./pages/Staking'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Referrals = lazy(() => import('./pages/Referrals'));
const AiMonitor = lazy(() => import('./pages/AiMonitor'));
const Profile = lazy(() => import('./pages/Profile'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminLogs = lazy(() => import('./pages/AdminLogs'));

// Loading Screen Fallback for Suspense
const LoadingScreen = () => (
  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#030712', color: '#00e5ff', fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ width: '40px', height: '40px', border: '4px solid rgba(0, 229, 255, 0.1)', borderTop: '4px solid #00e5ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <span>Loading Vortexa Systems...</span>
    </div>
  </div>
);

// Protected Route wrapper for Authenticated users
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Admin role check route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useApp();
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// Investor role check route wrapper
const InvestorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useApp();
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
};

// Public Route wrapper (redirects if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useApp();
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  }
  return <>{children}</>;
};

// Portal workspace layout structure
const WorkspaceLayout = () => {
  const { aiStatus } = useApp();

  return (
    <div style={{ display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Workspace Wrapper */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        <Header />

        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Volatility Alert */}
          {aiStatus.umbrellaRuleActive && (
            <div style={{ display: 'flex', gap: '16px', background: 'rgba(255, 23, 68, 0.08)', border: '1px solid rgba(255, 23, 68, 0.25)', padding: '20px', borderRadius: '16px' }}>
              <AlertTriangle size={24} color="#ff1744" style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: '#ff1744', fontSize: '16px', marginBottom: '4px' }}>AI Umbrella Risk Protection Active</h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  Abnormal volatility &gt; 8% detected. Staking calculations and arbitrage bot runs consolidated safely to USDT capital pool.
                </p>
              </div>
            </div>
          )}

          {/* Child Routes */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Inner routing component
function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/verify" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/forgot" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/reset" element={<PublicRoute><Auth /></PublicRoute>} />

        {/* Protected Routes (Wrapper Layout) */}
        <Route path="/" element={<ProtectedRoute><WorkspaceLayout /></ProtectedRoute>}>
          {/* Common pages */}
          <Route path="profile" element={<Profile />} />
          <Route path="update-password" element={<UpdatePassword />} />
          <Route path="notifications" element={<Notifications />} />

          {/* Investor pages */}
          <Route path="dashboard" element={<InvestorRoute><Dashboard /></InvestorRoute>} />
          <Route path="staking" element={<InvestorRoute><Staking /></InvestorRoute>} />
          <Route path="wallet" element={<InvestorRoute><Wallet /></InvestorRoute>} />
          <Route path="referrals" element={<InvestorRoute><Referrals /></InvestorRoute>} />
          <Route path="ai" element={<InvestorRoute><AiMonitor /></InvestorRoute>} />

          {/* Admin pages */}
          <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="admin/logs" element={<AdminRoute><AdminLogs /></AdminRoute>} />
        </Route>

        {/* Fallback Catch-all redirect to Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AdminProvider>
        <AppRoutes />
      </AdminProvider>
    </AppProvider>
  );
}
