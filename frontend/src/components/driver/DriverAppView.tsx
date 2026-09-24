import React, { useEffect, useState } from 'react';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { PriorityTier } from '../../types';
import { 
  Zap, 
  Clock, 
  Car, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders
} from 'lucide-react';

interface DriverAppViewProps {
  socket: ReturnType<typeof useSessionSocket>;
}

export const DriverAppView: React.FC<DriverAppViewProps> = ({ socket }) => {
  const { 
    sessions, 
    chargers, 
    vehicles, 
    updateVehiclePriority, 
    startSession, 
    stopSession 
  } = socket;

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>(vehicles[0]?.vehicle_id || '');
  const [selectedPortId, setSelectedPortId] = useState<number | ''>('');

  const currentVehicle = vehicles.find(v => v.vehicle_id === selectedVehicleId) || vehicles[0];
  const activeSession = sessions.find(s => s.vehicle_id === currentVehicle?.vehicle_id && s.status === 'active');

  const availablePorts = chargers.filter(c => c.status === 'available');

  const [priorityTier, setPriorityTier] = useState<PriorityTier>(currentVehicle?.priority_tier || 'medium');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (selectedVehicleId === '' && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].vehicle_id);
    }
  }, [selectedVehicleId, vehicles]);

  useEffect(() => {
    if (currentVehicle) {
      setPriorityTier(currentVehicle.priority_tier);
    }
  }, [currentVehicle?.vehicle_id, currentVehicle?.priority_tier]);

  const handleSavePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentVehicle) {
      await updateVehiclePriority(currentVehicle.vehicle_id, priorityTier);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const isVehicleCharging = !!activeSession;
  const powerVal = activeSession?.allocated_power_kw || 0;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="bg-[#0d0d0f] border border-zinc-800 rounded-2xl p-5 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />

        {/* Vehicle Switcher Bar */}
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/90 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1.5">
              <Car className="w-4 h-4 text-emerald-400" /> Driver Vehicle Portal
            </span>
            <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
              {availablePorts.length} Free Chargers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
            >
              {vehicles.map(v => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  Vehicle #{v.vehicle_id} - {v.driver}
                </option>
              ))}
            </select>

            {isVehicleCharging ? (
              <button
                onClick={() => activeSession && stopSession(activeSession.charger_id)}
                className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Stop Session (Charger #{activeSession.charger_id})</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedPortId}
                  onChange={(e) => setSelectedPortId(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:border-emerald-500 flex-1"
                >
                  <option value="">-- Choose Charger --</option>
                  {availablePorts.map(p => (
                    <option key={p.charger_id} value={p.charger_id}>
                      Charger #{p.charger_id} ({p.max_power_kw} kW)
                    </option>
                  ))}
                </select>

                <button
                  disabled={!selectedPortId || !currentVehicle}
                  onClick={() => {
                    if (selectedPortId && currentVehicle) {
                      startSession(Number(selectedPortId), currentVehicle.vehicle_id);
                      setSelectedPortId('');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shrink-0"
                >
                  Start Session
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Header Info */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">{currentVehicle?.driver || 'Fleet Vehicle'}</div>
              <div className="text-[11px] font-mono text-zinc-400">Vehicle ID: #{currentVehicle?.vehicle_id} • Capacity: {currentVehicle?.battery_capacity} kWh</div>
            </div>
          </div>

          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
            isVehicleCharging
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
          }`}>
            {isVehicleCharging ? 'CHARGING' : 'IDLE'}
          </span>
        </div>

        {/* Live Power Metrics */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-400 block flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Power Allocation
              </span>
              <span className="text-xl font-mono font-bold text-emerald-400">
                {powerVal} kW
              </span>
            </div>

            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-400 block flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Delivered Energy
              </span>
              <span className="text-xl font-mono font-bold text-cyan-300">
                {Number(activeSession?.kwh || 0).toFixed(2)} kWh
              </span>
            </div>
          </div>
        </div>

        {/* Priority Form */}
        <form onSubmit={handleSavePriority} className="space-y-4">
          <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">
            Priority Tier Setting
          </div>

          <div className="space-y-2">
            {[
              { id: 'high', label: '⚡ High Priority', desc: 'Prioritized first during site power cap constraints' },
              { id: 'medium', label: '🚚 Medium Priority', desc: 'Standard power allocation weight' },
              { id: 'low', label: '🌙 Low Priority', desc: 'Throttled first to reduce demand charges' },
            ].map((tier) => (
              <label
                key={tier.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  priorityTier === tier.id
                    ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                <input
                  type="radio"
                  name="driverPriority"
                  checked={priorityTier === tier.id}
                  onChange={() => setPriorityTier(tier.id as PriorityTier)}
                  className="mt-0.5 accent-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold text-zinc-200">{tier.label}</div>
                  <div className="text-[10px] text-zinc-400">{tier.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Sliders className="w-4 h-4" />}
            <span>{isSaved ? 'Priority Updated' : 'Update Priority Tier'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
