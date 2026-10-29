/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';
import { AttendancePage } from './pages/AttendancePage.tsx';
import { ActivitiesPage } from './pages/ActivitiesPage.tsx';
import { NoticesPage } from './pages/NoticesPage.tsx';
import { PointsPage } from './pages/PointsPage.tsx';
import { AuditLogsPage } from './pages/AuditLogsPage.tsx';
import { SystemBackupPage } from './pages/SystemBackupPage.tsx';
import { ChangePasswordModal } from './components/ChangePasswordModal.tsx';
import { ShieldCheck } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, isLoading, mustChangePassword } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [showVoluntaryPasswordModal, setShowVoluntaryPasswordModal] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-300" dir="rtl">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold">در حال بارگذاری سامانه مدیریت...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderCurrentPage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;
      case 'users':
        return <UsersPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'activities':
        return <ActivitiesPage />;
      case 'notices':
        return <NoticesPage />;
      case 'points':
        return <PointsPage />;
      case 'audit':
        return <AuditLogsPage />;
      case 'system':
        return <SystemBackupPage />;
      default:
        return <DashboardPage onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Vazirmatn',system-ui,sans-serif]" dir="rtl">
      {/* Top Bar following Top Bar Contract */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onChangePasswordClick={() => setShowVoluntaryPasswordModal(true)}
      />

      {/* Main Container with Sidebar + Page Viewport */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {renderCurrentPage()}
        </main>
      </div>

      {/* Forced Password Change Modal for first-time logins */}
      {mustChangePassword && (
        <ChangePasswordModal
          isOpen={true}
          forced={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      )}

      {/* Voluntary Password Change Modal */}
      {showVoluntaryPasswordModal && (
        <ChangePasswordModal
          isOpen={true}
          forced={false}
          onClose={() => setShowVoluntaryPasswordModal(false)}
          onSuccess={() => setShowVoluntaryPasswordModal(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
