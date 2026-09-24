import { useState, useEffect, useCallback, useRef } from 'react';
import { ChargingSession, Charger, Vehicle, PriorityTier, AlertNotification, Tenant } from '../types';
import { api, getAuthToken } from '../services/api';

export interface SessionSocketState {
  sessions: ChargingSession[];
  chargers: Charger[];
  vehicles: Vehicle[];
  tenant: Tenant | null;
  gridCapacityKw: number;
  totalKwDemand: number;
  isGridOverloaded: boolean;
  wsConnected: boolean;
  lastSyncTimestamp: string;
  notifications: AlertNotification[];
  // Control actions
  setSiteCapacity: (capacityKw: number) => Promise<void>;
  updateVehiclePriority: (vehicleId: number, priorityTier: PriorityTier) => Promise<void>;
  startSession: (chargerId: number, vehicleId: number) => Promise<void>;
  stopSession: (chargerId: number) => Promise<void>;
  completeSession: (sessionId: number, finalKwh: number) => Promise<void>;
  runAllocator: () => Promise<void>;
  addCharger: (maxPowerKw?: number) => Promise<void>;
  addVehicle: (driver: string, batteryCapacity: number, priorityTier?: PriorityTier) => Promise<void>;
  markNotificationRead: (notificationId: string) => void;
  refreshData: () => Promise<void>;
}

export function useSessionSocket(tenantId?: number): SessionSocketState {
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>('Connecting...');
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevOverloadedRef = useRef<boolean>(false);

  const gridCapacityKw = tenant?.site_power_cap_kw || 50;

  // Calculate current active power demand
  const totalKwDemand = sessions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.allocated_power_kw || 0), 0);

  const isGridOverloaded = totalKwDemand >= gridCapacityKw;

  const loadInitialData = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [tData, cData, sData, vData] = await Promise.all([
        api.getMe().catch(() => null),
        api.getChargers().catch(() => []),
        api.getSessions().catch(() => []),
        api.getVehicles().catch(() => []),
      ]);

      if (tData) setTenant(tData);
      setChargers(cData);
      setSessions(sData);
      setVehicles(vData);
    } catch (err) {
      console.warn('Failed to load initial REST data:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // WebSocket lifecycle management
  useEffect(() => {
    const token = getAuthToken();
    if (!tenantId || !token) {
      setWsConnected(false);
      return;
    }

    let isMounted = true;
    let reconnectDelay = 2000;

    const connectWebSocket = () => {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
      const wsProtocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';
      const host = apiBase.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
      const wsUrl = `${wsProtocol}//${host}/api/v1/ws/live/${tenantId}?token=${encodeURIComponent(token)}`;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) return;
        setWsConnected(true);
        reconnectDelay = 2000;
        setLastSyncTimestamp(new Date().toLocaleTimeString());
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          const timeStr = new Date().toLocaleTimeString();
          setLastSyncTimestamp(timeStr);

          if (data.type === 'initial_state') {
            if (data.chargers) {
              setChargers(data.chargers.map((c: any) => ({
                charger_id: c.charger_id,
                site_id: tenant?.site_id || 'site',
                tenant_id: tenantId,
                max_power_kw: c.max_power_kw,
                status: c.status,
              })));
            }
            if (data.sessions) {
              setSessions(data.sessions.map((s: any) => ({
                session_id: s.session_id,
                charger_id: s.charger_id,
                vehicle_id: s.vehicle_id,
                tenant_id: tenantId,
                start_time: new Date().toISOString(),
                kwh: s.kwh,
                allocated_power_kw: s.allocated_power_kw,
                peak_allocated_power_kw: s.peak_allocated_power_kw,
                status: 'active',
                driver: s.driver,
                priority_tier: s.priority_tier,
              })));
            }
          } else if (data.type === 'telemetry_update') {
            if (data.sessions && Array.isArray(data.sessions)) {
              setSessions(prev => {
                const map = new Map<number, ChargingSession>(prev.map(s => [s.session_id, s]));
                data.sessions.forEach((u: { session_id: number; requested_power_kw?: number; allocated_power_kw?: number; kwh?: number }) => {
                  const existing = map.get(u.session_id);
                  if (existing) {
                    map.set(u.session_id, {
                      session_id: existing.session_id,
                      charger_id: existing.charger_id,
                      vehicle_id: existing.vehicle_id,
                      tenant_id: existing.tenant_id,
                      start_time: existing.start_time,
                      end_time: existing.end_time,
                      kwh: u.kwh ?? existing.kwh,
                      allocated_power_kw: u.allocated_power_kw ?? existing.allocated_power_kw,
                      peak_allocated_power_kw: existing.peak_allocated_power_kw,
                      status: existing.status,
                      created_at: existing.created_at,
                      updated_at: existing.updated_at,
                      driver: existing.driver,
                      priority_tier: existing.priority_tier,
                      requested_power_kw: u.requested_power_kw ?? existing.requested_power_kw,
                    });
                  }
                });
                return Array.from(map.values());
              });
            }
          } else if (data.type === 'allocation_update') {
            if (data.allocations && Array.isArray(data.allocations)) {
              setSessions(prev => {
                const allocMap = new Map(data.allocations.map((a: { charger_id: number; allocated_kw: number; requested_kw: number }) => [a.charger_id, a]));
                return prev.map(s => {
                  const alloc = allocMap.get(s.charger_id) as { allocated_kw: number; requested_kw: number } | undefined;
                  if (alloc) {
                    return {
                      ...s,
                      allocated_power_kw: alloc.allocated_kw,
                      requested_power_kw: alloc.requested_kw,
                    };
                  }
                  return s;
                });
              });
            }
          } else if (data.type === 'session_completed') {
            const sId = data.session?.session_id;
            const cId = data.session?.charger_id;
            if (sId) {
              setSessions(prev => prev.map(s => s.session_id === sId ? { ...s, status: 'completed', kwh: data.session.final_kwh } : s));
            }
            if (cId) {
              setChargers(prev => prev.map(c => c.charger_id === cId ? { ...c, status: 'available' } : c));
            }
          } else if (data.type === 'session_started') {
            loadInitialData();
          } else if (data.type === 'charger_status') {
            if (data.charger_id) {
              setChargers(prev => prev.map(c => c.charger_id === data.charger_id ? { ...c, status: data.status } : c));
            }
          }
        } catch (e) {
          console.warn('WebSocket message parse error:', e);
        }
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setWsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 10000);
          connectWebSocket();
        }, reconnectDelay);
      };

      socket.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        socket.close();
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [tenantId, tenant?.site_id, loadInitialData]);

  // Monitor overload alerts
  useEffect(() => {
    if (isGridOverloaded && !prevOverloadedRef.current) {
      prevOverloadedRef.current = true;
      const alertNotif: AlertNotification = {
        id: `alert-${Date.now()}`,
        timestamp: 'Just now',
        title: '⚠️ Grid Demand Response Threshold Reached',
        message: `Total demand (${totalKwDemand} kW) reached site cap (${gridCapacityKw} kW). Greedily allocating by priority.`,
        type: 'alert',
        read: false,
      };
      setNotifications(prev => [alertNotif, ...prev]);
    } else if (!isGridOverloaded) {
      prevOverloadedRef.current = false;
    }
  }, [isGridOverloaded, totalKwDemand, gridCapacityKw]);

  // Control Functions calling real REST API
  const setSiteCapacity = useCallback(async (newCapKw: number) => {
    if (!tenantId) return;
    const updated = await api.updateTenant(tenantId, { site_power_cap_kw: newCapKw });
    setTenant(updated);
    const notif: AlertNotification = {
      id: `cap-${Date.now()}`,
      timestamp: 'Just now',
      title: '⚙️ Site Electrical Cap Updated',
      message: `Updated site electrical power cap limit to ${newCapKw} kW.`,
      type: 'info',
      read: false,
    };
    setNotifications(prev => [notif, ...prev]);
  }, [tenantId]);

  const updateVehiclePriority = useCallback(async (vehicleId: number, priorityTier: PriorityTier) => {
    await api.updateVehiclePriority(vehicleId, priorityTier);
    await loadInitialData();
    await api.runAllocator().catch(() => {});
    const notif: AlertNotification = {
      id: `prio-${Date.now()}`,
      timestamp: 'Just now',
      title: '⚡ Vehicle Priority Tier Updated',
      message: `Vehicle ${vehicleId} set to ${priorityTier.toUpperCase()} priority tier.`,
      type: 'info',
      read: false,
    };
    setNotifications(prev => [notif, ...prev]);
  }, [loadInitialData]);

  const startSession = useCallback(async (chargerId: number, vehicleId: number) => {
    await api.startChargingSession(chargerId, vehicleId);
    await loadInitialData();
    await api.runAllocator().catch(() => {});
  }, [loadInitialData]);

  const stopSession = useCallback(async (chargerId: number) => {
    await api.stopChargingSession(chargerId);
    await loadInitialData();
    await api.runAllocator().catch(() => {});
  }, [loadInitialData]);

  const completeSession = useCallback(async (sessionId: number, finalKwh: number) => {
    await api.completeSession(sessionId, finalKwh);
    await loadInitialData();
  }, [loadInitialData]);

  const runAllocator = useCallback(async () => {
    const res = await api.runAllocator();
    if (res.allocations) {
      const allocMap = new Map(res.allocations.map(a => [a.charger_id, a]));
      setSessions(prev => prev.map(s => {
        const alloc = allocMap.get(s.charger_id);
        if (alloc) {
          return {
            ...s,
            allocated_power_kw: alloc.allocated_kw,
            requested_power_kw: alloc.requested_kw,
          };
        }
        return s;
      }));
    }
  }, []);

  const addCharger = useCallback(async (maxPowerKw: number = 11) => {
    if (!tenantId || !tenant) return;
    await api.createCharger({ site_id: tenant.site_id, tenant_id: tenantId, max_power_kw: maxPowerKw });
    await loadInitialData();
  }, [tenantId, tenant, loadInitialData]);

  const addVehicle = useCallback(async (driver: string, batteryCapacity: number, priorityTier: PriorityTier = 'medium') => {
    if (!tenantId) return;
    await api.createVehicle({ tenant_id: tenantId, driver, battery_capacity: batteryCapacity, priority_tier: priorityTier });
    await loadInitialData();
  }, [tenantId, loadInitialData]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
  }, []);

  return {
    sessions,
    chargers,
    vehicles,
    tenant,
    gridCapacityKw,
    totalKwDemand,
    isGridOverloaded,
    wsConnected,
    lastSyncTimestamp,
    notifications,
    setSiteCapacity,
    updateVehiclePriority,
    startSession,
    stopSession,
    completeSession,
    runAllocator,
    addCharger,
    addVehicle,
    markNotificationRead,
    refreshData: loadInitialData,
  };
}
