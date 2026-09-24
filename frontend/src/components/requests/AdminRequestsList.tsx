import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminRequest, RequestType } from '../../types';
import { 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  User, 
  Zap, 
  AlertTriangle, 
  Filter, 
  Send,
  ShieldCheck,
  Plus
} from 'lucide-react';

interface AdminRequestsListProps {
  onOpenCreateUserModal?: () => void;
}

export const AdminRequestsList: React.FC<AdminRequestsListProps> = ({ onOpenCreateUserModal }) => {
  const { adminRequests, approveRequest, rejectRequest, role } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedReq, setSelectedReq] = useState<AdminRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');

  const filteredRequests = adminRequests.filter((req) => {
    const matchesType = filterType === 'all' || req.type === filterType;
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const pendingCount = adminRequests.filter(r => r.status === 'pending').length;

  const handleApprove = (id: string) => {
    approveRequest(id, adminNotes);
    setSelectedReq(null);
    setAdminNotes('');
  };

  const handleReject = (id: string) => {
    rejectRequest(id, adminNotes);
    setSelectedReq(null);
    setAdminNotes('');
  };

  const getRequestIcon = (type: RequestType) => {
    switch (type) {
      case 'tenant_onboarding':
        return <Building2 className="w-4 h-4 text-emerald-400" />;
      case 'driver_access':
        return <User className="w-4 h-4 text-blue-400" />;
      case 'power_cap_increase':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'charger_fault_report':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Inbox className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0d0f] p-4 rounded-xl border border-zinc-800">
        <div>
          <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-emerald-400" />
            <span>Admin Requests & Onboarding Approvals</span>
            {pendingCount > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30 uppercase tracking-tight">
                {pendingCount} Pending Approval
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review incoming requests for tenant onboarding, driver access credentials, power limit overrides, and charger service reports.
          </p>
        </div>

        {onOpenCreateUserModal && role === 'tenant_manager' && (
          <button
            onClick={onOpenCreateUserModal}
            className="flex items-center gap-2 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3.5 py-2 rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New User Account</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d0d0f]/60 p-3 rounded-xl border border-zinc-800 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-zinc-400 font-medium">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Request Types</option>
            <option value="tenant_onboarding">Tenant Onboarding</option>
            <option value="driver_access">Driver Account Access</option>
            <option value="power_cap_increase">Power Sub-Cap Boost</option>
            <option value="charger_fault_report">Charger Maintenance</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-zinc-400 font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRequests.map((req) => {
          const isPending = req.status === 'pending';
          const isApproved = req.status === 'approved';

          return (
            <div
              key={req.id}
              className={`bg-[#0d0d0f] border rounded-xl p-4 space-y-3 shadow-lg transition-all ${
                isPending ? 'border-amber-500/40 bg-amber-950/10' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Request Header */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                    {getRequestIcon(req.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-tight block">
                      {req.id} • {req.type.replace('_', ' ')}
                    </span>
                    <h3 className="font-bold text-zinc-100 text-xs mt-0.5">{req.title}</h3>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold shrink-0 ${
                    isPending
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : isApproved
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-red-950 text-red-300 border-red-800'
                  }`}
                >
                  {req.status}
                </span>
              </div>

              {/* Details & Metadata */}
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/60">
                {req.details}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Requester</span>
                  <span className="font-medium text-zinc-200">{req.requesterName}</span>
                  <span className="block text-[10px] font-mono text-zinc-500">{req.requesterEmail}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Submitted Date</span>
                  <span className="font-mono text-zinc-300">
                    {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Reviewed info if not pending */}
              {!isPending && req.reviewedBy && (
                <div className="text-[10px] bg-zinc-950 p-2 rounded border border-zinc-800 text-zinc-400 space-y-0.5">
                  <div>
                    <span className="text-zinc-500">Reviewed By:</span> {req.reviewedBy} at{' '}
                    {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ''}
                  </div>
                  {req.adminNotes && (
                    <div>
                      <span className="text-zinc-500">Admin Notes:</span> {req.adminNotes}
                    </div>
                  )}
                </div>
              )}

              {/* Admin Action Buttons */}
              {isPending && role === 'tenant_manager' && (
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setSelectedReq(req)}
                    className="flex items-center gap-1.5 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Review & Approve</span>
                  </button>

                  <button
                    onClick={() => handleReject(req.id)}
                    className="flex items-center gap-1.5 text-xs bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredRequests.length === 0 && (
        <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl p-8 text-center space-y-2">
          <Inbox className="w-8 h-8 text-zinc-600 mx-auto" />
          <div className="text-xs font-bold text-zinc-300">No requests match selected filters</div>
          <p className="text-[11px] text-zinc-500">All incoming onboarding and access requests are currently up to date.</p>
        </div>
      )}

      {/* Review & Approve Modal */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl text-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                  Approve Request #{selectedReq.id}
                </span>
                <h2 className="text-sm font-bold text-zinc-100">{selectedReq.title}</h2>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="text-zinc-400 hover:text-zinc-200 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Request Details</span>
                <p className="text-zinc-300 text-xs">{selectedReq.details}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Admin Resolution Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add approval comments or provisioning instructions..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs p-2.5 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs hover:text-zinc-200"
              >
                Cancel
              </button>

              <button
                onClick={() => handleApprove(selectedReq.id)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Confirm Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
