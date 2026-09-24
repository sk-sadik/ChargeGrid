import React, { useState } from 'react';
import { ChargingSession, SessionStatus, PriorityTier } from '../../types';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { 
  Zap, 
  AlertTriangle, 
  ShieldAlert,
  Search,
} from 'lucide-react';

interface ChargingKanbanBoardProps {
  socket: ReturnType<typeof useSessionSocket>;
}

const COLUMNS: { id: SessionStatus; title: string; subtitle: string; color: string; dotColor: string }[] = [
  {
    id: 'active',
    title: 'ACTIVE CHARGING',
    subtitle: 'Allocated dynamic power rate from allocator',
    color: 'text-emerald-400',
    dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  },
  {
    id: 'completed',
    title: 'COMPLETED',
    subtitle: 'Session finished / vehicle uncoupled',
    color: 'text-cyan-400',
    dotColor: 'bg-cyan-500',
  },
  {
    id: 'interrupted',
    title: 'INTERRUPTED',
    subtitle: 'Session interrupted or disconnected',
    color: 'text-amber-500',
    dotColor: 'bg-amber-500',
  },
];

const PRIORITY_TIER_CONFIG: Record<PriorityTier, { label: string; bg: string; text: string }> = {
  high: { label: 'HIGH PRIORITY', bg: 'bg-red-950/80 border-red-800', text: 'text-red-300' },
  medium: { label: 'MEDIUM PRIORITY', bg: 'bg-blue-950/80 border-blue-800', text: 'text-blue-300' },
  low: { label: 'LOW PRIORITY', bg: 'bg-purple-950/80 border-purple-800', text: 'text-purple-300' },
};

export const ChargingKanbanBoard: React.FC<ChargingKanbanBoardProps> = ({ socket }) => {
  const { sessions, vehicles, updateVehiclePriority, stopSession, runAllocator, isGridOverloaded, gridCapacityKw, totalKwDemand, tenant } = socket;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<ChargingSession | null>(null);

  // Filtered session list
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = 
      (s.driver || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.vehicle_id).includes(searchQuery) ||
      String(s.charger_id).includes(searchQuery) ||
      String(s.session_id).includes(searchQuery);

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Board Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0d0f] p-4 rounded-xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>Charging Session Board</span>
              <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 border border-zinc-800 rounded uppercase tracking-tighter font-mono">
                {tenant?.name || 'Tenant Site'}
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time power allocation from FastAPI allocator & live WebSocket telemetry updates.
          </p>
        </div>

        {/* Filters & Grid Meter Summary */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search driver, charger ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 w-48 lg:w-56"
            />
          </div>

          {/* Run Allocator Button */}
          <button
            onClick={runAllocator}
            className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trigger Allocator</span>
          </button>

          {/* Capacity Mini Gauge */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Zap className={`w-3.5 h-3.5 ${isGridOverloaded ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
            <span className="text-zinc-400">Demand:</span>
            <span className="font-bold text-zinc-100">{totalKwDemand} kW</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{gridCapacityKw} kW Cap</span>
          </div>
        </div>
      </div>

      {/* Grid Load Warning Banner */}
      {isGridOverloaded && (
        <div className="bg-gradient-to-r from-red-950/90 via-amber-950/70 to-zinc-950 border-2 border-red-500/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-red-900/80 text-red-200 rounded-lg shrink-0 border border-red-700">
              <ShieldAlert className="w-5 h-5 text-red-100 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-red-100 text-sm tracking-tight">
                  ⚠️ GRID DEMAND WARNING: Power Cap Reached
                </h3>
                <span className="text-[10px] font-mono font-bold bg-red-900 text-red-100 border border-red-600 px-2 py-0.5 rounded">
                  {Math.min(100, Math.round((totalKwDemand / gridCapacityKw) * 100))}% LOAD
                </span>
              </div>
              <p className="text-xs text-red-200/90 mt-0.5">
                Total demand ({totalKwDemand} kW) exceeds site power cap ({gridCapacityKw} kW). Lower priority tier sessions will receive reduced power allocations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board Columns Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const colSessions = filteredSessions.filter((s) => s.status === col.id);

          return (
            <div key={col.id} className="flex flex-col min-h-[500px]">
              {/* Column Header */}
              <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dotColor}`}></div>
                  <span className={`text-xs font-bold ${col.color}`}>{col.title}</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{colSessions.length}</span>
              </div>

              {/* Column Body Container */}
              <div className="flex-1 bg-zinc-950/50 rounded-lg p-2.5 space-y-3 border border-zinc-900 overflow-y-auto no-scrollbar">
                {colSessions.length === 0 ? (
                  <div className="h-32 border border-dashed border-zinc-800/80 rounded-lg flex items-center justify-center text-zinc-600 text-xs text-center p-2">
                    No sessions in this column
                  </div>
                ) : (
                  colSessions.map((session) => (
                    <KanbanCard
                      key={session.session_id}
                      session={session}
                      vehicles={vehicles}
                      onStopSession={() => stopSession(session.charger_id)}
                      onOpenDetail={() => setSelectedSession(session)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Session Detail & Priority Tuning Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          vehicles={vehicles}
          onClose={() => setSelectedSession(null)}
          onUpdatePriority={async (prio) => {
            await updateVehiclePriority(selectedSession.vehicle_id, prio);
            setSelectedSession(null);
          }}
          onStopSession={async () => {
            await stopSession(selectedSession.charger_id);
            setSelectedSession(null);
          }}
        />
      )}
    </div>
  );
};

const KanbanCard: React.FC<{
  session: ChargingSession;
  vehicles: ReturnType<typeof useSessionSocket>['vehicles'];
  onStopSession: () => void;
  onOpenDetail: () => void;
}> = ({ session, vehicles, onStopSession, onOpenDetail }) => {
  const vehicle = vehicles.find(v => v.vehicle_id === session.vehicle_id);
  const priority = session.priority_tier || vehicle?.priority_tier || 'medium';
  const prioConfig = PRIORITY_TIER_CONFIG[priority];

  let cardBorder = 'border-zinc-800';
  if (session.status === 'active') {
    cardBorder = 'border-emerald-500/40';
  } else if (session.status === 'interrupted') {
    cardBorder = 'border-amber-500/40';
  }

  return (
    <div className={`bg-zinc-900 border ${cardBorder} p-3.5 rounded-lg shadow-sm space-y-3 hover:border-zinc-700 transition-all group relative`}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight font-mono">
          Session #{session.session_id}
        </span>
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${prioConfig.bg} ${prioConfig.text}`}>
          {prioConfig.label}
        </span>
      </div>

      {/* Vehicle & Driver */}
      <div>
        <p className="text-xs font-bold text-zinc-100">{session.driver || vehicle?.driver || `Driver #${session.vehicle_id}`}</p>
        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Charger ID: {session.charger_id} | Vehicle ID: {session.vehicle_id}</p>
      </div>

      {/* Power metrics */}
      <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Zap className={`w-3.5 h-3.5 ${session.allocated_power_kw > 0 ? 'text-emerald-400' : 'text-zinc-600'}`} />
          <span>Allocated</span>
        </div>
        <span className="font-bold text-emerald-400">{session.allocated_power_kw || 0} kW</span>
      </div>

      {/* Energy Delivered */}
      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
        <span>Energy Delivered:</span>
        <span className="font-bold text-zinc-200">{Number(session.kwh || 0).toFixed(2)} kWh</span>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
        <button onClick={onOpenDetail} className="text-zinc-400 hover:text-emerald-400 font-medium">
          View Detail & Priority
        </button>
        {session.status === 'active' && (
          <button onClick={onStopSession} className="text-red-400 hover:underline font-bold">
            Stop Session
          </button>
        )}
      </div>
    </div>
  );
};

const SessionDetailModal: React.FC<{
  session: ChargingSession;
  vehicles: ReturnType<typeof useSessionSocket>['vehicles'];
  onClose: () => void;
  onUpdatePriority: (prio: PriorityTier) => void;
  onStopSession: () => void;
}> = ({ session, vehicles, onClose, onUpdatePriority, onStopSession }) => {
  const vehicle = vehicles.find(v => v.vehicle_id === session.vehicle_id);
  const [priority, setPriority] = useState<PriorityTier>(session.priority_tier || vehicle?.priority_tier || 'medium');

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 space-y-5 text-slate-200 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Session Inspector</span>
            <h2 className="text-base font-bold text-slate-100">Session #{session.session_id}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 font-bold text-lg">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Driver</span>
            <span className="font-medium text-slate-200">{session.driver || vehicle?.driver || 'Fleet Driver'}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Charger ID</span>
            <span className="font-mono text-slate-200">#{session.charger_id}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Allocated Power</span>
            <span className="font-mono font-bold text-emerald-400">{session.allocated_power_kw} kW</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Total kWh Delivered</span>
            <span className="font-mono font-bold text-cyan-300">{Number(session.kwh || 0).toFixed(2)} kWh</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="text-xs font-semibold text-slate-300 block">Vehicle Priority Tier</label>
          <div className="space-y-2">
            {[
              { id: 'high', label: 'High Priority', desc: 'Prioritized first by greedy allocator during grid power constraints' },
              { id: 'medium', label: 'Medium Priority', desc: 'Standard power allocation weight' },
              { id: 'low', label: 'Low Priority', desc: 'Throttled first if site power cap is reached' },
            ].map((tier) => (
              <label
                key={tier.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  priority === tier.id
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  checked={priority === tier.id}
                  onChange={() => setPriority(tier.id as PriorityTier)}
                  className="mt-0.5 accent-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">{tier.label}</div>
                  <div className="text-[10px] text-slate-400">{tier.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs">
          <button
            type="button"
            onClick={onStopSession}
            className="px-3 py-1.5 rounded bg-red-950 border border-red-800 text-red-300 hover:bg-red-900 font-medium"
          >
            Stop Charging
          </button>
          <button
            type="button"
            onClick={() => onUpdatePriority(priority)}
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md"
          >
            Save Vehicle Priority
          </button>
        </div>
      </div>
    </div>
  );
};
