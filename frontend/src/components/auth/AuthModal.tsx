import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Zap, 
  Lock, 
  UserPlus, 
  AlertCircle
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, loginWithEmail, registerTenant } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login state
  const [username, setUsername] = useState<string>('site-a');
  const [password, setPassword] = useState<string>('demo123');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!showAuthModal) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const result = await loginWithEmail(username, password);
    setLoading(false);
    if (!result.success) {
      setErrorMsg(result.message || 'Login failed.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const result = await registerTenant(username, password);
    setLoading(false);
    if (!result.success) {
      setErrorMsg(result.message || 'Registration failed.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d0f] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 text-zinc-200 shadow-2xl relative">
        <button
          onClick={() => setShowAuthModal(false)}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 font-bold text-lg"
        >
          &times;
        </button>

        {/* Brand Badge */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 bg-emerald-500 text-black font-bold px-3 py-1 rounded-lg text-xs shadow-md">
            <Zap className="w-4 h-4 fill-current" />
            <span>FASTAPI JWT AUTH</span>
          </div>
          <h2 className="text-base font-bold text-zinc-100">Charge Grid Portal</h2>
          <p className="text-xs text-zinc-400">Sign in or register a new tenant company account</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === 'login'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In (Login)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === 'register'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Register Tenant
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-300 font-semibold block mb-1">Username / Site ID</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. site-a"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-semibold block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-300 font-semibold block mb-1">New Tenant Site ID / Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. site-c"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-semibold block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{loading ? 'Registering...' : 'Register Tenant Account'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
