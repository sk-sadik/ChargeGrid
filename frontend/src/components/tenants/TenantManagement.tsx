import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Building2, 
  Zap, 
  ShieldCheck,
  Edit2
} from 'lucide-react';

export const TenantManagement: React.FC = () => {
  const { tenant, refreshTenant } = useAuth();
  const [editingCap, setEditingCap] = useState<boolean>(false);
  const [newCapKw, setNewCapKw] = useState<number>(tenant?.site_power_cap_kw || 50);
  const [newTenantName, setNewTenantName] = useState<string>(tenant?.name || '');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    try {
      await api.updateTenant(tenant.tenant_id, {
        name: newTenantName || tenant.name,
        site_power_cap_kw: newCapKw,
      });
      await refreshTenant();
      setEditingCap(false);
    } catch (err) {
      console.warn('Failed to update tenant:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0d0f] p-4 rounded-xl border border-zinc-800">
        <div>
          <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <span>Tenant Site & Capacity Management</span>
            <span className="text-[10px] bg-zinc-900 text-emerald-400 font-mono px-2 py-0.5 rounded border border-zinc-800 uppercase tracking-tight">
              FastAPI Context
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your site electrical power limits, site ID, and billing plan settings.
          </p>
        </div>
      </div>

      {/* Tenant Card */}
      {tenant ? (
        <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl p-6 space-y-6 max-w-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-xl font-mono">
                {tenant.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 text-lg">{tenant.name}</h3>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">
                  Tenant ID: {tenant.tenant_id} | Site ID: {tenant.site_id}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setNewCapKw(tenant.site_power_cap_kw);
                setNewTenantName(tenant.name);
                setEditingCap(!editingCap);
              }}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{editingCap ? 'Cancel' : 'Edit Tenant Settings'}</span>
            </button>
          </div>

          {!editingCap ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-500 block uppercase font-bold">Site Power Cap</span>
                <span className="font-mono font-bold text-emerald-400 text-lg">{tenant.site_power_cap_kw} kW</span>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-500 block uppercase font-bold">Billing Plan</span>
                <span className="font-semibold text-zinc-100 text-sm capitalize">{tenant.billing_plan}</span>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="text-[10px] text-zinc-500 block uppercase font-bold">Site ID</span>
                <span className="font-mono text-zinc-300 text-sm">{tenant.site_id}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Tenant Name</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Site Power Cap Limit (kW)</label>
                <input
                  type="number"
                  value={newCapKw}
                  onChange={(e) => setNewCapKw(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg font-mono focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCap(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Save Settings
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-xs">
          No tenant context available. Log in to manage your tenant settings.
        </div>
      )}
    </div>
  );
};
