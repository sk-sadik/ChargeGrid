import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserSession, Role, Tenant, UserAccount, AdminRequest } from '../types';
import { api, setAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  user: UserSession | null;
  role: Role;
  tenant: Tenant | null;
  userAccounts: UserAccount[];
  adminRequests: AdminRequest[];
  loginWithEmail: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  registerTenant: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  registerDriverAccount: (data: {
    email: string;
    password: string;
    name: string;
    licensePlate: string;
    vehicleModel: string;
    tenantId: number;
  }) => { success: boolean; message?: string };
  createUserAccount: (account: Omit<UserAccount, 'id' | 'created_at'>) => UserAccount;
  createAdminRequest: (request: Omit<AdminRequest, 'id' | 'createdAt' | 'status'>) => AdminRequest;
  approveRequest: (requestId: string, adminNotes?: string) => void;
  rejectRequest: (requestId: string, adminNotes?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  refreshTenant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Mock states for un-backed features (Driver approval flow & request tracking)
  // TODO: no backend endpoint yet for driver approval workflow
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    try {
      const stored = localStorage.getItem('gridcharge_user_accounts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>(() => {
    try {
      const stored = localStorage.getItem('gridcharge_admin_requests');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('gridcharge_user_accounts', JSON.stringify(userAccounts));
  }, [userAccounts]);

  useEffect(() => {
    localStorage.setItem('gridcharge_admin_requests', JSON.stringify(adminRequests));
  }, [adminRequests]);

  const loadCurrentTenant = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setTenant(null);
      setLoading(false);
      setShowAuthModal(true);
      return;
    }

    try {
      const tenantData = await api.getMe();
      setTenant(tenantData);
      setUser({
        id: `user-tenant-${tenantData.tenant_id}`,
        name: tenantData.name,
        username: tenantData.name,
        role: 'tenant_manager',
        tenant_id: tenantData.tenant_id,
        tenant_name: tenantData.name,
        site_id: tenantData.site_id,
      });
      setShowAuthModal(false);
    } catch (err: any) {
      const isSessionExpired = err.message === 'Session expired';
      if (isSessionExpired) {
        console.info('Session expired (tenant not found), clearing stored credentials');
      } else {
        console.warn('Failed to fetch current tenant context:', err);
      }
      setAuthToken(null);
      setUser(null);
      setTenant(null);
      setShowAuthModal(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentTenant();

    const handleUnauthorized = () => {
      setUser(null);
      setTenant(null);
      setShowAuthModal(true);
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, [loadCurrentTenant]);

  const loginWithEmail = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.login(username, password);
      await loadCurrentTenant();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login failed' };
    }
  };

  const registerTenant = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.register(username, password);
      await loadCurrentTenant();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setTenant(null);
    setShowAuthModal(true);
  };

  // Driver self-registration (Local state fallback until driver backend endpoint is added)
  // TODO: no backend endpoint yet for driver approval workflow
  const registerDriverAccount = (data: {
    email: string;
    password: string;
    name: string;
    licensePlate: string;
    vehicleModel: string;
    tenantId: number;
  }): { success: boolean; message?: string } => {
    const newAcc: UserAccount = {
      id: `usr-driver-${Date.now()}`,
      username: data.email,
      role: 'driver',
      tenant_id: data.tenantId,
      created_at: new Date().toISOString(),
      status: 'active',
    };

    setUserAccounts(prev => [newAcc, ...prev]);

    createAdminRequest({
      type: 'driver_access',
      title: `Driver Account Created: ${data.name}`,
      requesterName: data.name,
      requesterEmail: data.email,
      tenantId: data.tenantId,
      tenantName: tenant?.name,
      details: `New driver registered for vehicle ${data.vehicleModel} (${data.licensePlate}).`,
    });

    return { success: true };
  };

  const createUserAccount = (accountData: Omit<UserAccount, 'id' | 'created_at'>): UserAccount => {
    const newAcc: UserAccount = {
      ...accountData,
      id: `usr-${accountData.role}-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setUserAccounts(prev => [newAcc, ...prev]);
    return newAcc;
  };

  const createAdminRequest = (reqData: Omit<AdminRequest, 'id' | 'createdAt' | 'status'>): AdminRequest => {
    const newReq: AdminRequest = {
      ...reqData,
      id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setAdminRequests(prev => [newReq, ...prev]);
    return newReq;
  };

  const approveRequest = (requestId: string, adminNotes?: string) => {
    setAdminRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status: 'approved', reviewedAt: new Date().toISOString(), adminNotes } : r)
    );
  };

  const rejectRequest = (requestId: string, adminNotes?: string) => {
    setAdminRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status: 'rejected', reviewedAt: new Date().toISOString(), adminNotes } : r)
    );
  };

  const role: Role = user?.role || 'tenant_manager';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center font-mono">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Authenticating with Charge Grid...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        tenant,
        userAccounts,
        adminRequests,
        loginWithEmail,
        registerTenant,
        registerDriverAccount,
        createUserAccount,
        createAdminRequest,
        approveRequest,
        rejectRequest,
        logout,
        isAuthenticated: !!user,
        showAuthModal,
        setShowAuthModal,
        refreshTenant: loadCurrentTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
