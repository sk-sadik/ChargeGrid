import {
  Tenant,
  Charger,
  ChargingSession,
  Vehicle,
  Invoice,
  InvoiceBreakdown,
  AllocatorResponse,
  PriorityTier,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

let authToken: string | null = localStorage.getItem('gridcharge_jwt');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('gridcharge_jwt', token);
  } else {
    localStorage.removeItem('gridcharge_jwt');
  }
};

export const getAuthToken = (): string | null => {
  return authToken || localStorage.getItem('gridcharge_jwt');
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof URLSearchParams) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setAuthToken(null);
    window.dispatchEvent(new Event('auth_unauthorized'));
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'API request failed');
  }

  return response.json();
}

export const api = {
  // --- AUTH ---
  async login(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }

    const data = await response.json();
    setAuthToken(data.access_token);
    return data;
  },

  async register(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const data = await request<{ access_token: string; token_type: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthToken(data.access_token);
    return data;
  },

  // --- TENANTS ---
  async getMe(): Promise<Tenant> {
    return request<Tenant>('/tenants/me');
  },

  async updateTenant(tenantId: number, data: { name?: string; billing_plan?: string; site_power_cap_kw?: number }): Promise<Tenant> {
    return request<Tenant>(`/tenants/${tenantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // --- CHARGERS ---
  async getChargers(): Promise<Charger[]> {
    return request<Charger[]>('/chargers');
  },

  async createCharger(data: { site_id: string; tenant_id: number; max_power_kw?: number }): Promise<Charger> {
    return request<Charger>('/chargers', {
      method: 'POST',
      body: JSON.stringify({
        site_id: data.site_id,
        tenant_id: data.tenant_id,
        max_power_kw: data.max_power_kw ?? 11,
      }),
    });
  },

  async startChargingSession(chargerId: number, vehicleId: number): Promise<Charger> {
    return request<Charger>(`/chargers/${chargerId}/start-session?vehicle_id=${vehicleId}`, {
      method: 'POST',
    });
  },

  async stopChargingSession(chargerId: number): Promise<Charger> {
    return request<Charger>(`/chargers/${chargerId}/stop-session`, {
      method: 'POST',
    });
  },

  // --- SESSIONS ---
  async getSessions(sessionStatus?: string): Promise<ChargingSession[]> {
    const param = sessionStatus ? `?session_status=${sessionStatus}` : '';
    return request<ChargingSession[]>(`/sessions${param}`);
  },

  async getActiveSessions(): Promise<ChargingSession[]> {
    return request<ChargingSession[]>('/sessions/active');
  },

  async completeSession(sessionId: number, finalKwh: number): Promise<ChargingSession> {
    return request<ChargingSession>(`/sessions/${sessionId}/complete?final_kwh=${finalKwh}`, {
      method: 'POST',
    });
  },

  // --- VEHICLES ---
  async getVehicles(): Promise<Vehicle[]> {
    return request<Vehicle[]>('/vehicles');
  },

  async createVehicle(data: { tenant_id: number; battery_capacity: number; driver: string; priority_tier?: PriorityTier }): Promise<Vehicle> {
    return request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: data.tenant_id,
        battery_capacity: data.battery_capacity,
        driver: data.driver,
        priority_tier: data.priority_tier || 'medium',
      }),
    });
  },

  async updateVehiclePriority(vehicleId: number, priorityTier: PriorityTier): Promise<Vehicle> {
    return request<Vehicle>(`/vehicles/${vehicleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ priority_tier: priorityTier }),
    });
  },

  // --- INVOICES ---
  async getInvoices(): Promise<Invoice[]> {
    return request<Invoice[]>('/invoices');
  },

  async generateInvoice(period: string): Promise<Invoice> {
    return request<Invoice>(`/invoices/generate/${period}`, {
      method: 'POST',
    });
  },

  async getInvoiceBreakdown(invoiceId: number): Promise<InvoiceBreakdown> {
    return request<InvoiceBreakdown>(`/invoices/${invoiceId}/breakdown`);
  },

  // --- ALLOCATOR ---
  async runAllocator(): Promise<AllocatorResponse> {
    return request<AllocatorResponse>('/allocator/run', {
      method: 'POST',
    });
  },

  async getAllocatorStatus(): Promise<AllocatorResponse> {
    return request<AllocatorResponse>('/allocator/status');
  },

  // --- DRIVER REGISTRATION & APPROVAL (UN-BACKED FEATURE) ---
  // TODO: no backend endpoint yet for driver self-registration approval requests
};
