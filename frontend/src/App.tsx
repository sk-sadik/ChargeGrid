import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSessionSocket } from './hooks/useSessionSocket';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ChargingKanbanBoard } from './components/board/ChargingKanbanBoard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { ChargerManagement } from './components/chargers/ChargerManagement';
import { TenantManagement } from './components/tenants/TenantManagement';
import { DriverAppView } from './components/driver/DriverAppView';
import { BillingInvoices } from './components/billing/BillingInvoices';
import { AdminRequestsList } from './components/requests/AdminRequestsList';
import { CreateUserModal } from './components/users/CreateUserModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { AuthModal } from './components/auth/AuthModal';

function MainLayout() {
  const { role, tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(role === 'driver' ? 'driver' : 'board');
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState<boolean>(false);

  // Initialize central WebSocket real-time session socket hook
  const socket = useSessionSocket(tenant?.tenant_id);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        socket={socket}
        onToggleNotifications={() => setIsNotifOpen(prev => !prev)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Role-adaptive Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOverloaded={socket.isGridOverloaded}
        />

        {/* Dynamic View Route Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto w-full">
            {activeTab === 'board' && <ChargingKanbanBoard socket={socket} />}
            {activeTab === 'dashboard' && <AdminDashboard socket={socket} />}
            {activeTab === 'chargers' && <ChargerManagement socket={socket} />}
            {activeTab === 'tenants' && <TenantManagement />}
            {activeTab === 'requests' && (
              <AdminRequestsList
                onOpenCreateUserModal={() => setIsCreateUserModalOpen(true)}
              />
            )}
            {activeTab === 'driver' && <DriverAppView socket={socket} />}
            {activeTab === 'billing' && <BillingInvoices />}
          </main>

          {/* System Logs Footer Bar */}
          <footer className="h-10 border-t border-zinc-800/80 bg-[#0d0d0f] px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-6 text-[10px] text-zinc-500 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500">●</span>
                <span>SYS_OK</span>
              </div>
              <div className="truncate max-w-[400px] hidden sm:block">
                [{socket.lastSyncTimestamp}] Charge Grid Optimizer: {socket.isGridOverloaded ? 'CAP_LIMIT_ENGAGED - Throttling Low Priority' : 'Active Power Allocation Stable'}
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-zinc-500 uppercase font-bold font-mono">
              <span>OCPP 1.6J</span>
              <span>Latency: 28ms</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Create User & Account Modal */}
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
      />

      {/* Notification Drawer Slideover */}
      <NotificationDrawer
        socket={socket}
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />

      {/* OIDC / OAuth2 Authentication Modal */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

