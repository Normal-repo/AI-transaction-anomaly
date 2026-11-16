import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldAlert, Filter, Clock, CheckCircle2, AlertOctagon, Plus, Eye, MessageSquare } from 'lucide-react';
import { InvestigationCase } from '../types';
import { api } from '../api/client';
import { RiskGradeBadge } from '../components/RiskGradeBadge';
import { CaseEditModal } from '../components/CaseEditModal';
import { RiskReportModal } from '../components/RiskReportModal';

export const Investigations: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [clientId, setClientId] = useState(searchParams.get('client_id') || '');

  // Modals
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [inspectTxId, setInspectTxId] = useState<string | null>(null);

  const loadCases = () => {
    setLoading(true);
    api.getCases({
      status: statusFilter,
      severity: severityFilter,
      client_id: clientId || undefined
    })
      .then(res => setCases(res.items))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter, severityFilter, clientId]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Investigation Case Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Review suspicious flags, assign triage tiers, document analyst findings, and resolve security cases.
          </p>
        </div>
      </div>

      {/* Filter Tabs / Controls */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'FALSE_POSITIVE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <input
            type="text"
            placeholder="Filter Customer ID..."
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44"
          />
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Linked Transaction</th>
                <th className="py-3 px-4 text-right">Flagged Amount</th>
                <th className="py-3 px-4">Risk Grade</th>
                <th className="py-3 px-4">Severity Tier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Analyst</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Loading active investigation cases...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No investigation cases match the selected filters.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {c.case_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{c.client_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{c.client_id}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400">
                      <button
                        onClick={() => setInspectTxId(c.tx_id)}
                        className="hover:underline flex items-center gap-1 text-emerald-400"
                        title="Inspect transaction risk report"
                      >
                        {c.tx_id} <Eye className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                      ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskGradeBadge grade={c.risk_grade} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        c.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        c.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {c.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] ${
                        c.status === 'OPEN' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        c.status === 'UNDER_REVIEW' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                        c.status === 'FALSE_POSITIVE' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.assigned_to || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCaseId(c.case_id)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                      >
                        Review & Notes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Review / Edit Modal */}
      <CaseEditModal
        caseId={selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        onSuccess={loadCases}
      />

      {/* Risk Report Modal for Linked Tx */}
      <RiskReportModal
        txId={inspectTxId}
        onClose={() => setInspectTxId(null)}
      />
    </div>
  );
};

