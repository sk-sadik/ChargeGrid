import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { 
  Zap, 
  Bell, 
  Building2, 
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  socket: ReturnType<typeof useSessionSocket>;
  onToggleNotifications: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ socket, onToggleNotifications }) => {
  const { user, tenant, logout, setShowAuthModal } = useAuth();
  const unreadCount = socket.notifications.filter(n => !n.read).length;

  return (
    <header className="bg-[#09090b] border-b border-zinc-800 text-zinc-100 sticky top-0 z-40 px-4 lg:px-6 h-16 flex items-center justify-between shadow-sm shrink-0">
      {/* Brand & Site Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-black fill-black" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white hidden sm:inline">Charge Grid</span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md text-zinc-300">
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-zinc-200">
            {tenant?.name || 'Charge Grid Site'}
          </span>
          {tenant && (
            <span className="ml-1 bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold font-mono">
              Cap: {tenant.site_power_cap_kw} kW
            </span>
          )}
        </div>
      </div>

      {/* Real-time WebSocket Live Status */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* WS Connection Beacon */}
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 font-mono ${
          socket.wsConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${socket.wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span>{socket.wsConnected ? 'FASTAPI WS LIVE' : 'WS DISCONNECTED'}</span>
        </div>

        {/* Notifications Bell */}
        <button
          onClick={onToggleNotifications}
          className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
          title="Alert Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Auth / Logout */}
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">{user.name}</span>
            <button
              onClick={logout}
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-xs bg-emerald-500 hover:bg-emerald-400 text-black px-3.5 py-1.5 rounded font-bold transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
