import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Kanban, 
  Zap, 
  Building2, 
  Car, 
  Receipt, 
  ShieldAlert,
  Inbox
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOverloaded?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOverloaded }) => {
  const { role, tenant, user, adminRequests } = useAuth();

  const pendingRequestsCount = adminRequests.filter(r => r.status === 'pending').length;

  const siteNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['tenant_manager'] },
    { id: 'board', label: 'Live Sessions', icon: Kanban, roles: ['tenant_manager'], badge: 'FASTAPI WS' },
    { id: 'chargers', label: 'Chargers', icon: Zap, roles: ['tenant_manager'] },
  ];

  const adminNavItems = [
    { id: 'tenants', label: 'Tenant Site', icon: Building2, roles: ['tenant_manager'] },
    { 
      id: 'requests', 
      label: 'Admin Requests', 
      icon: Inbox, 
      roles: ['tenant_manager'],
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount}` : undefined,
      badgeColor: 'amber'
    },
    { id: 'billing', label: 'Invoices & Billing', icon: Receipt, roles: ['tenant_manager', 'driver'] },
    { id: 'driver', label: 'Driver App', icon: Car, roles: ['tenant_manager', 'driver'] },
  ];

  const visibleSiteItems = siteNavItems.filter(item => item.roles.includes(role));
  const visibleAdminItems = adminNavItems.filter(item => item.roles.includes(role));

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'GO';

  return (
    <aside className="w-full md:w-64 bg-[#0d0d0f] border-r border-zinc-800 text-zinc-300 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-4">
        {/* Overload Alert Warning */}
        {isOverloaded && (
          <div className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-800/80 text-amber-300 text-xs flex items-center gap-2 animate-pulse">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">Power Cap Threshold Engaged</span>
          </div>
        )}

        {/* Site Management Nav */}
        {visibleSiteItems.length > 0 && (
          <nav className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-2 py-2">
              Site Management
            </div>
            {visibleSiteItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all ${
                    isActive
                      ? 'bg-zinc-800/50 text-white font-medium border border-zinc-700/50 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Administration Nav */}
        {visibleAdminItems.length > 0 && (
          <nav className="space-y-1 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-2 py-2">
              Administration
            </div>
            {visibleAdminItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all ${
                    isActive
                      ? 'bg-zinc-800/50 text-white font-medium border border-zinc-700/50 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                      item.badgeColor === 'amber'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* User Profile Footer Card */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-black shrink-0 font-mono">
            {initials}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-medium text-zinc-100 truncate">{user?.name || 'Tenant Manager'}</p>
            <p className="text-[10px] text-zinc-500 truncate capitalize font-mono">
              {tenant?.name || 'Tenant Site'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
