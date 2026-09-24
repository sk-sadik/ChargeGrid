import React, { useState, useEffect, useCallback } from 'react';
import { Invoice, InvoiceBreakdown } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Receipt, 
  Plus, 
  ArrowDownToLine
} from 'lucide-react';

export const BillingInvoices: React.FC = () => {
  const { tenant } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceBreakdown, setSelectedInvoiceBreakdown] = useState<InvoiceBreakdown | null>(null);
  const [generatePeriod, setGeneratePeriod] = useState<string>('2026-08');
  const [loading, setLoading] = useState<boolean>(true);

  const loadInvoices = useCallback(async () => {
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (err) {
      console.warn('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.generateInvoice(generatePeriod);
      await loadInvoices();
    } catch (err) {
      console.warn('Failed to generate invoice:', err);
    }
  };

  const handleViewBreakdown = async (invoiceId: number) => {
    try {
      const breakdown = await api.getInvoiceBreakdown(invoiceId);
      setSelectedInvoiceBreakdown(breakdown);
    } catch (err) {
      console.warn('Failed to get invoice breakdown:', err);
    }
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    const content = `=====================================================
GRID CHARGING OPTIMIZER INVOICE STATEMENT
=====================================================
Invoice ID: #${invoice.invoice_id}
Tenant ID: ${invoice.tenant_id}
Billing Period: ${invoice.period}

SUMMARY:
- Total Energy Delivered: ${Number(invoice.total_kwh || 0).toFixed(2)} kWh @ $0.30/kWh
- Peak kW Demand Charge: ${invoice.peak_kw} kW @ $15.00/kW

TOTAL AMOUNT DUE: $${Number(invoice.amount || 0).toFixed(2)}
=====================================================
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoice.invoice_id}_${invoice.period}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0d0f] p-4 rounded-xl border border-zinc-800">
        <div>
          <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <span>Fleet Billing & Invoices</span>
            <span className="text-[10px] bg-zinc-900 text-emerald-400 font-mono px-2 py-0.5 rounded border border-zinc-800 uppercase tracking-tight">
              {tenant?.name || 'Tenant Site'}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Calculated from completed sessions: kWh energy rate ($0.30/kWh) + peak kW demand charge ($15.00/kW).
          </p>
        </div>

        <form onSubmit={handleGenerateInvoice} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Period (e.g. 2026-08)"
            value={generatePeriod}
            onChange={(e) => setGeneratePeriod(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
            required
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Invoice</span>
          </button>
        </form>
      </div>

      {/* Invoice Table */}
      <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="p-3.5">Invoice ID</th>
                <th className="p-3.5">Billing Period</th>
                <th className="p-3.5">Energy Delivered</th>
                <th className="p-3.5">Peak Demand</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    No invoices generated yet for this tenant.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.invoice_id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="p-3.5 font-bold text-zinc-100 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      #{invoice.invoice_id}
                    </td>

                    <td className="p-3.5 text-zinc-300">
                      {invoice.period}
                    </td>

                    <td className="p-3.5 font-bold text-zinc-200">
                      {Number(invoice.total_kwh || 0).toFixed(2)} kWh
                    </td>

                    <td className="p-3.5 text-zinc-400">
                      {invoice.peak_kw} kW
                    </td>

                    <td className="p-3.5 font-bold text-emerald-400 text-sm">
                      ${Number(invoice.amount || 0).toFixed(2)}
                    </td>

                    <td className="p-3.5 text-right space-x-2 font-sans">
                      <button
                        onClick={() => handleViewBreakdown(invoice.invoice_id)}
                        className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs transition-colors"
                      >
                        Breakdown
                      </button>

                      <button
                        onClick={() => handleDownloadPdf(invoice)}
                        className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 text-xs transition-colors"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Itemized Breakdown Modal */}
      {selectedInvoiceBreakdown && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0f] border border-zinc-800 rounded-xl w-full max-w-md p-5 space-y-4 text-zinc-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">FastAPI Billing Breakdown</span>
                <h2 className="text-base font-bold text-zinc-100">Invoice #{selectedInvoiceBreakdown.invoice_id}</h2>
              </div>
              <button onClick={() => setSelectedInvoiceBreakdown(null)} className="text-zinc-400 hover:text-zinc-200 font-bold text-lg">&times;</button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex justify-between text-zinc-300">
                  <span>Energy ({selectedInvoiceBreakdown.energy.kwh.toFixed(2)} kWh @ ${selectedInvoiceBreakdown.energy.rate_per_kwh}/kWh)</span>
                  <span className="font-bold">${selectedInvoiceBreakdown.energy.cost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-zinc-300">
                  <span>Peak Demand ({selectedInvoiceBreakdown.demand.peak_kw} kW @ ${selectedInvoiceBreakdown.demand.rate_per_kw}/kW)</span>
                  <span className="font-bold">${selectedInvoiceBreakdown.demand.cost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-emerald-400">
                  <span>Estimated Savings vs Uncontrolled</span>
                  <span className="font-bold">${selectedInvoiceBreakdown.savings_vs_uncontrolled.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-zinc-100 text-sm">
                  <span>Total Invoice Amount</span>
                  <span className="text-emerald-400">${selectedInvoiceBreakdown.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setSelectedInvoiceBreakdown(null)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-xs transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
