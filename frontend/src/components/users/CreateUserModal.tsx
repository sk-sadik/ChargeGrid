import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { UserPlus, Mail, Lock, User, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: Role;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'driver',
}) => {
  const { createUserAccount, tenant: currentTenant } = useAuth();

  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState<Role>(defaultRole);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username) {
      setErrorMsg('Please enter a username.');
      return;
    }

    try {
      const created = createUserAccount({
        username,
        role: userRole,
        tenant_id: currentTenant?.tenant_id,
        status: 'active',
      });

      setSuccessMsg(`Account created for ${created.username}!`);
      setTimeout(() => {
        onClose();
        setUsername('');
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      setErrorMsg('Failed to create account.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl text-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Create New User Account</h2>
              <p className="text-[11px] text-zinc-400">Set up user credentials for tenant #{currentTenant?.tenant_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 font-bold text-lg">&times;</button>
        </div>

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Username <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. driver-1"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Role</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as Role)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="driver">Driver</option>
              <option value="tenant_manager">Tenant Manager</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Create User</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
