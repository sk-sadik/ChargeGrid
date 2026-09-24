import React, { useState } from 'react';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { 
  Zap, 
  Sliders, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Activity,
  Plug,
  PlugZap,
  CheckCircle,
  ShieldAlert
} from 'lucide-react';
import { PriorityTier } from '../../types';

interface AdminDashboardProps {
  socket: ReturnType<typeof useSessionSocket>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ socket }) => {
  const { 
    gridCapacityKw, 
    setSiteCapacity, 
    totalKwDemand, 
    isGridOverloaded, 
    chargers, 
    sessions,
    vehicles,
    tenant,
    startSession,
    stopSession,
    addCharger,
    addVehicle
  } = socket;

  const [sliderCap, setSliderCap] = useState<number>(gridCapacityKw);
  const [selectedVehicleForPlug, setSelectedVehicleForPlug] = useState<number | ''>('');
  const [selectedChargerForPlug, setSelectedChargerForPlug] = useState<number | ''>('');
  const [newDriverName, setNewDriverName] = useState<string>('');
  const [newBatteryCap, setNewBatteryCap] = useState<number>(60);
  const [newPriorityTier, setNewPriorityTier] = useState<PriorityTier>('medium');

  const activeChargersCount = chargers.filter(c => c.status === 'charging').length;
  const capacityPct = Math.min(100, Math.round((totalKwDemand / (gridCapacityKw || 1)) * 100));

  const totalPorts = chargers.length;
  const occupiedPorts = chargers.filter(c => c.status === 'charging').length;
  const freePorts = chargers.filter(c => c.status === 'available').length;
  const availableChargerPorts = chargers.filter(c => c.status === 'available');

  return (
    <div className="space-y-6">
      {/* Title & Top Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Site Power & Capacity Dashboard</span>
            <span className="text-xs bg-zinc-900 text-emerald-400 font-mono px-2 py-0.5 rounded border border-zinc-800">
              {tenant?.name || 'Site Depot'}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time transformer load monitoring, active session power allocation, and site power limit control.
          </p>
        </div>

        {/* Dynamic Capacity Gauge Slider Control */}
        <div className="bg-[#0d0d0f] border border-zinc-800 p-3 rounded-xl flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Site Power Cap</div>
              <div className="font-mono font-bold text-zinc-100 text-sm">{gridCapacityKw} kW</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={200}
              step={5}
              value={sliderCap}
              onChange={(e) => setSliderCap(Number(e.target.value))}
              onMouseUp={() => setSiteCapacity(sliderCap)}
              onTouchEnd={() => setSiteCapacity(sliderCap)}
              className="w-28 sm:w-36 accent-emerald-500 cursor-pointer"
            />
            <button
              onClick={() => setSiteCapacity(sliderCap)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-2.5 py-1 rounded transition-colors"
            >
              Apply Cap
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Grid Load Warning */}
      {isGridOverloaded && (
        <div className="bg-gradient-to-r from-red-950/90 via-amber-950/70 to-zinc-950 border-2 border-red-500/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-red-900/80 text-red-200 rounded-lg shrink-0 border border-red-700">
              <ShieldAlert className="w-5 h-5 text-red-100 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-red-100 text-sm tracking-tight">
                  ⚠️ GRID DEMAND WARNING: Power Cap Reached
                </h3>
                <span className="text-[10px] font-mono font-bold bg-red-900 text-red-100 border border-red-600 px-2 py-0.5 rounded">
                  {capacityPct}% LOAD
                </span>
              </div>
              <p className="text-xs text-red-200/90 mt-0.5">
                Current demand ({totalKwDemand} kW) exceeds site power cap limit ({gridCapacityKw} kW). The FastAPI greedy allocator prioritizes high-tier vehicles and limits low-tier allocations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSiteCapacity(gridCapacityKw + 25)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>Increase Cap (+25 kW)</span>
            </button>
          </div>
        </div>
      )}

      {/* Charging Ports Overview Row */}
      <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plug className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">
              Charger Hardware Infrastructure
            </h2>
          </div>
          <button
            onClick={() => addCharger(11)}
            className="text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded hover:bg-emerald-900"
          >
            + Add Charger
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-lg space-y-1">
            <div className="text-[10px] font-bold text-zinc-500 uppercase">Total Chargers</div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold text-zinc-100">{totalPorts}</span>
              <span className="text-[10px] text-zinc-500">FastAPI Models</span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-emerald-950 p-3 rounded-lg space-y-1">
            <div className="text-[10px] font-bold text-emerald-400 uppercase flex items-center justify-between">
              <span>Occupied / Charging</span>
              <PlugZap className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold text-emerald-400">{occupiedPorts}</span>
              <span className="text-[10px] text-zinc-400 font-mono">Active Sessions</span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-lg space-y-1">
            <div className="text-[10px] font-bold text-blue-400 uppercase flex items-center justify-between">
              <span>Available Ports</span>
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold text-blue-400">{freePorts}</span>
              <span className="text-[10px] text-zinc-500">Ready for Session</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Power Demand Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">Total Power Demand</span>
            <Zap className={`w-4 h-4 ${isGridOverloaded ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-zinc-100">{totalKwDemand} kW</span>
            <span className={`text-xs font-mono font-bold ${capacityPct > 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {capacityPct}% Cap
            </span>
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
            <div
              className={`h-full transition-all duration-500 ${
                capacityPct > 85 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, capacityPct)}%` }}
            />
          </div>
          <div className="text-[10px] text-zinc-500 flex justify-between font-mono">
            <span>0 kW</span>
            <span>Site Cap: {gridCapacityKw} kW</span>
          </div>
        </div>

        {/* Active Chargers Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">Active Charging Ports</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-zinc-100">{activeChargersCount} <span className="text-xs text-zinc-500 font-normal">of {chargers.length}</span></span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>FastAPI WebSocket Synchronized</span>
          </div>
        </div>

        {/* Active Sessions Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">Active Sessions</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-zinc-100">{sessions.filter(s => s.status === 'active').length}</span>
            <span className="text-xs text-emerald-400 font-mono">Live Telemetry</span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Telemetry interval ~2s</span>
          </div>
        </div>

        {/* Optimization Mode */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">Greedy Allocator</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-zinc-100">Greedy Tier</span>
            <span className="text-xs text-emerald-400 font-mono">High &gt; Med &gt; Low</span>
          </div>
          <div className="text-[11px] text-zinc-400 pt-1">
            Priority Tier Power Dispatch
          </div>
        </div>
      </div>

      {/* Active Chargers Grid */}
      <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-100 text-sm">Site Charger Socket Grid</h3>
            <p className="text-xs text-zinc-400">Click a charger card to stop active charging</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {chargers.map((charger) => {
            const isCharging = charger.status === 'charging';

            return (
              <div
                key={charger.charger_id}
                onClick={() => {
                  if (isCharging) {
                    stopSession(charger.charger_id);
                  }
                }}
                className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                  isCharging ? 'bg-emerald-950/40 border-emerald-500/50 cursor-pointer hover:border-red-500/50' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-zinc-200">Charger #{charger.charger_id}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${isCharging ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
                </div>
                <div className="font-mono text-zinc-400 text-xs">
                  Max: {charger.max_power_kw} kW
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <span className={isCharging ? 'text-emerald-400' : 'text-zinc-500'}>{charger.status}</span>
                  {isCharging && <span className="text-red-400 hover:underline">Stop</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vehicle Fleet Controller */}
      <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div>
            <h3 className="font-bold text-zinc-100 text-sm">Vehicle Fleet Register</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Start charging sessions on available chargers</p>
          </div>

          {/* Start Session Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedVehicleForPlug}
              onChange={(e) => setSelectedVehicleForPlug(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Select Vehicle --</option>
              {vehicles.map(v => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  #{v.vehicle_id} - {v.driver} ({v.priority_tier.toUpperCase()})
                </option>
              ))}
            </select>

            <select
              value={selectedChargerForPlug}
              onChange={(e) => setSelectedChargerForPlug(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Select Free Charger --</option>
              {availableChargerPorts.map(c => (
                <option key={c.charger_id} value={c.charger_id}>
                  Charger #{c.charger_id} ({c.max_power_kw} kW)
                </option>
              ))}
            </select>

            <button
              disabled={!selectedVehicleForPlug || !selectedChargerForPlug}
              onClick={() => {
                if (selectedVehicleForPlug && selectedChargerForPlug) {
                  startSession(Number(selectedChargerForPlug), Number(selectedVehicleForPlug));
                  setSelectedVehicleForPlug('');
                  setSelectedChargerForPlug('');
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <PlugZap className="w-3.5 h-3.5" />
              <span>Start Session</span>
            </button>
          </div>
        </div>

        {/* Add New Vehicle Form */}
        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-zinc-300">Add Vehicle:</span>
          <input
            type="text"
            placeholder="Driver Name (e.g. Driver-1)"
            value={newDriverName}
            onChange={(e) => setNewDriverName(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded focus:outline-none focus:border-emerald-500"
          />
          <input
            type="number"
            placeholder="Battery Capacity kWh"
            value={newBatteryCap}
            onChange={(e) => setNewBatteryCap(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded focus:outline-none focus:border-emerald-500 w-28 font-mono"
          />
          <select
            value={newPriorityTier}
            onChange={(e) => setNewPriorityTier(e.target.value as PriorityTier)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded focus:outline-none focus:border-emerald-500"
          >
            <option value="high">HIGH Priority</option>
            <option value="medium">MEDIUM Priority</option>
            <option value="low">LOW Priority</option>
          </select>
          <button
            disabled={!newDriverName}
            onClick={() => {
              if (newDriverName) {
                addVehicle(newDriverName, newBatteryCap, newPriorityTier);
                setNewDriverName('');
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded transition-colors disabled:opacity-50"
          >
            + Register Vehicle
          </button>
        </div>

        {/* Vehicle List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800/60 uppercase font-mono text-[10px]">
                <th className="pb-2 font-medium">Vehicle ID</th>
                <th className="pb-2 font-medium">Driver Name</th>
                <th className="pb-2 font-medium">Battery Capacity</th>
                <th className="pb-2 font-medium">Priority Tier</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-zinc-300 font-mono">
              {vehicles.map((v) => {
                const activeSession = sessions.find(s => s.vehicle_id === v.vehicle_id && s.status === 'active');

                return (
                  <tr key={v.vehicle_id} className="hover:bg-zinc-900/30">
                    <td className="py-2.5 font-bold text-zinc-100">#{v.vehicle_id}</td>
                    <td className="py-2.5 font-sans font-medium text-zinc-200">{v.driver}</td>
                    <td className="py-2.5">{v.battery_capacity} kWh</td>
                    <td className="py-2.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                        v.priority_tier === 'high' ? 'bg-red-950 border-red-800 text-red-300' : v.priority_tier === 'medium' ? 'bg-blue-950 border-blue-800 text-blue-300' : 'bg-purple-950 border-purple-800 text-purple-300'
                      }`}>
                        {v.priority_tier}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      {activeSession ? (
                        <button
                          onClick={() => stopSession(activeSession.charger_id)}
                          className="bg-red-950 border border-red-800 text-red-300 hover:bg-red-900 text-[11px] font-medium px-2.5 py-1 rounded transition-colors"
                        >
                          Stop Session (Charger #{activeSession.charger_id})
                        </button>
                      ) : (
                        <button
                          disabled={availableChargerPorts.length === 0}
                          onClick={() => {
                            if (availableChargerPorts.length > 0) {
                              startSession(availableChargerPorts[0].charger_id, v.vehicle_id);
                            }
                          }}
                          className="bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 text-[11px] font-medium px-2.5 py-1 rounded transition-colors disabled:opacity-40"
                        >
                          Start Charging ({availableChargerPorts[0] ? `Port #${availableChargerPorts[0].charger_id}` : 'No Port'})
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
    </div>
  );
};
