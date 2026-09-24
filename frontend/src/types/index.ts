export type Role = 'tenant_manager' | 'driver';

export interface Tenant {
  tenant_id: number;
  name: string;
  site_id: string;
  billing_plan: string;
  site_power_cap_kw: number;
  created_at?: string;
  updated_at?: string;
}

export type ChargerStatus = 'available' | 'charging' | 'unavailable' | 'faulted';

export interface Charger {
  charger_id: number;
  site_id: string;
  tenant_id: number;
  max_power_kw: number;
  status: ChargerStatus;
  created_at?: string;
  updated_at?: string;
}

export type SessionStatus = 'active' | 'completed' | 'interrupted';

export type PriorityTier = 'high' | 'medium' | 'low';

export interface ChargingSession {
  session_id: number;
  charger_id: number;
  vehicle_id: number;
  tenant_id: number;
  start_time: string;
  end_time?: string | null;
  kwh: number;
  allocated_power_kw: number;
  peak_allocated_power_kw: number;
  status: SessionStatus;
  created_at?: string;
  updated_at?: string;
  // Display / telemetry fields populated via WebSocket or vehicle metadata
  driver?: string;
  priority_tier?: PriorityTier;
  requested_power_kw?: number;
}

export interface Vehicle {
  vehicle_id: number;
  tenant_id: number;
  battery_capacity: number;
  driver: string;
  priority_tier: PriorityTier;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  invoice_id: number;
  tenant_id: number;
  period: string;
  total_kwh: number;
  peak_kw: number;
  amount: number;
  created_at?: string;
}

export interface InvoiceBreakdown {
  invoice_id: number;
  period: string;
  energy: {
    kwh: number;
    rate_per_kwh: number;
    cost: number;
  };
  demand: {
    peak_kw: number;
    rate_per_kw: number;
    cost: number;
  };
  total_amount: number;
  savings_vs_uncontrolled: number;
}

export interface AlertNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  tenantId?: number;
  sessionId?: number;
  read: boolean;
}

export interface UserSession {
  id: string;
  user_id?: number;
  name: string;
  username: string;
  role: Role;
  tenant_id?: number;
  tenant_name?: string;
  site_id?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  role: Role;
  tenant_id?: number;
  created_at: string;
  status: 'active' | 'pending';
}

export type RequestType = 'tenant_onboarding' | 'driver_access' | 'power_cap_increase' | 'charger_fault_report';

export interface AdminRequest {
  id: string;
  type: RequestType;
  title: string;
  requesterName: string;
  requesterEmail: string;
  tenantId?: number;
  tenantName?: string;
  details: string;
  requestedKw?: number;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
}

export interface AllocationResult {
  charger_id: number;
  vehicle_id: number;
  requested_kw: number;
  allocated_kw: number;
  priority_tier: PriorityTier;
  reason: string;
}

export interface AllocatorResponse {
  site_power_cap_kw: number;
  total_requested_kw: number;
  total_allocated_kw: number;
  allocations: AllocationResult[];
  timestamp: string;
}
