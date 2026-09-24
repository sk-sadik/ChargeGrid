import React from 'react';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { AlertNotification } from '../../types';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldAlert, 
  X,
  Check
} from 'lucide-react';

interface NotificationDrawerProps {
  socket: ReturnType<typeof useSessionSocket>;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ socket, isOpen, onClose }) => {
  const { notifications, markNotificationRead } = socket;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-slate-900 border-l border-slate-800 text-slate-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h2 className="font-bold text-sm text-slate-100">Live Grid Alerts & Toasts</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Notifications Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No notification alerts logged.
          </div>
        ) : (
          notifications.map((n) => {
            let Icon = Info;
            let iconColor = 'text-blue-400';
            let bg = 'bg-slate-950 border-slate-800';

            if (n.type === 'alert' || n.type === 'warning') {
              Icon = AlertTriangle;
              iconColor = 'text-amber-400';
              bg = 'bg-amber-950/30 border-amber-800/60';
            } else if (n.type === 'success') {
              Icon = CheckCircle2;
              iconColor = 'text-emerald-400';
              bg = 'bg-emerald-950/30 border-emerald-800/60';
            }

            return (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all cursor-pointer relative ${bg} ${
                  !n.read ? 'ring-1 ring-emerald-500/50' : 'opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                    {n.title}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{n.timestamp}</span>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {n.message}
                </p>

                {!n.read && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
