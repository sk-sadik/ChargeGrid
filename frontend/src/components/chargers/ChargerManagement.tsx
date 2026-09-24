import React, { useState } from 'react';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { 
  Zap, 
  Plus, 
  Plug, 
  PlugZap, 
  CheckCircle, 
  Search,
  Filter,
} from 'lucide-react';

interface ChargerManagementProps {
  socket: ReturnType<typeof useSessionSocket>;
}

export const ChargerManagement: React.FC<ChargerManagementProps> = ({ socket }) => {
  const { chargers, tenant, startSession, stopSession, addCharger, vehicles } = socket;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedVehicleMap, setSelectedVehicleMap] = useState<Record<number, number>>({});

  const totalPorts = chargers.length;
  const occupiedPorts = chargers.filter(c => c.status === 'charging').length;
  const freePorts = chargers.filter(c => c.status === 'available').length;

  const filteredChargers = chargers.filter(c => {
    const matchesSearch = String(c.charger_id).includes(searchQuery) || (c.site_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0d0f] p-4 rounded-xl border border-zinc-800">
        <div>
          <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <span>Charger Infrastructure</span>
            <span className="text-[10px] text-zinc-500 font-mono px-2 py-0.5 rounded border border-zinc-800 uppercase tracking-tight">
              {tenant?.name || 'Site Depot'}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage physical EVSE charger units and start or stop charging sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Charger</span>
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[#0d0d0f] border border-zinc-800 p-3 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center justify-between">
            <span>Total Chargers</span>
            <Plug className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-xl font-mono font-bold text-zinc-100">{totalPorts} Chargers</div>
        </div>

        <div className="bg-[#0d0d0f] border border-emerald-950 p-3 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-emerald-400 uppercase flex items-center justify-between">
            <span>Charging</span>
            <PlugZap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400">{occupiedPorts} Active</div>
        </div>

        <div className="bg-[#0d0d0f] border border-blue-950 p-3 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-blue-400 uppercase flex items-center justify-between">
            <span>Available</span>
            <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-mono font-bold text-blue-400">{freePorts} Available</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d0d0f]/60 p-3 rounded-xl border border-zinc-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search charger ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="charging">Charging</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="faulted">Faulted</option>
          </select>
        </div>
      </div>

      {/* Chargers Table */}
      <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="p-3.5">Charger ID</th>
                <th className="p-3.5">Site ID</th>
                <th className="p-3.5">Max Power</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 font-mono">
              {filteredChargers.map((charger) => {
                const isCharging = charger.status === 'charging';
                const isAvailable = charger.status === 'available';

                return (
                  <tr key={charger.charger_id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="p-3.5 font-bold text-zinc-100 flex items-center gap-2">
                      <Zap className={`w-4 h-4 ${isCharging ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      Charger #{charger.charger_id}
                    </td>

                    <td className="p-3.5 text-zinc-300">
                      {charger.site_id}
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-zinc-200">{charger.max_power_kw} kW</span>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                          isCharging
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : isAvailable
                            ? 'bg-zinc-900 text-zinc-300 border-zinc-800'
                            : 'bg-red-950 text-red-300 border-red-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isCharging ? 'bg-emerald-400 animate-ping' : 'bg-current'}`} />
                        {charger.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right space-x-2 font-sans">
                      {isAvailable && (
                        <div className="inline-flex items-center gap-2">
                          <select
                            value={selectedVehicleMap[charger.charger_id] || ''}
                            onChange={(e) => setSelectedVehicleMap({ ...selectedVehicleMap, [charger.charger_id]: Number(e.target.value) })}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded focus:outline-none"
                          >
                            <option value="">-- Select Vehicle --</option>
                            {vehicles.map(v => (
                              <option key={v.vehicle_id} value={v.vehicle_id}>
                                #{v.vehicle_id} - {v.driver}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={!selectedVehicleMap[charger.charger_id]}
                            onClick={() => {
                              const vId = selectedVehicleMap[charger.charger_id];
                              if (vId) startSession(charger.charger_id, vId);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition-colors text-xs font-bold disabled:opacity-50"
                          >
                            Start Session
                          </button>
                        </div>
                      )}
                      {isCharging && (
                        <button
                          onClick={() => stopSession(charger.charger_id)}
                          className="px-2.5 py-1 rounded bg-red-950 border border-red-800 text-red-300 hover:bg-red-900 transition-colors text-xs font-bold"
                        >
                          Stop Session
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Charger Modal */}
      {showAddModal && (
        <AddChargerModal
          onClose={() => setShowAddModal(false)}
          onAdd={async (maxKw) => {
            await addCharger(maxKw);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

const AddChargerModal: React.FC<{ onClose: () => void; onAdd: (maxKw: number) => Promise<void> }> = ({ onClose, onAdd }) => {
  const [maxPower, setMaxPower] = useState<number>(11);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd(maxPower);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 space-y-4 text-slate-200 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-100">Add New Charger</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 font-bold text-lg">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Max Power Rating (kW)</label>
            <input
              type="number"
              value={maxPower}
              onChange={(e) => setMaxPower(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg font-mono focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md"
            >
              Create Charger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
