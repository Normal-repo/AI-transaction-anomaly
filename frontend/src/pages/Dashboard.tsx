import React, { useEffect, useState } from 'react';
import {
  Users,
  CreditCard,
  AlertTriangle,
  Flame,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { DashboardSummary } from '../types';
import { api } from '../api/client';
import { RiskGradeBadge } from '../components/RiskGradeBadge';
import { FieldTooltip } from '../components/FieldTooltip';
import { RiskReportModal } from '../components/RiskReportModal';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    api.getDashboardSummary()
      .then(data => setSummary(data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to connect to monitoring API.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Executive Risk Monitoring Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time behavioral baseline tracking and actionable transaction risk warnings.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-2 self-start transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Feed
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Customers</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {summary?.total_customers ?? '—'}
          </div>
          <div className="text-[11px] text-slate-500">Monitored profiles</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Transactions Processed</span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {summary?.transactions_processed ?? '—'}
          </div>
          <div className="text-[11px] text-slate-500">30-day evaluated window</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center">
              Suspicious Activity <FieldTooltip field="risk_score" />
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {summary?.suspicious_transactions ?? '—'}
          </div>
          <div className="text-[11px] text-amber-500/80">Requiring analyst review</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center">
              High / Critical Alerts <FieldTooltip field="risk_grade" />
            </span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {summary?.high_critical_alerts ?? '—'}
          </div>
          <div className="text-[11px] text-rose-500/80">High priority severity</div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Open Investigations</span>
            <FolderOpen className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {summary?.open_investigations ?? '—'}
          </div>
          <div className="text-[11px] text-slate-500">In triage / review</div>
        </div>
      </div>

      {/* Actionable Suspicious Warnings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              Active Suspicious Warnings Requiring Review
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Flagged anomalies automatically triaged by the multi-signal AI engine.
            </p>
          </div>
          <button
            onClick={() => navigate('/transactions?suspicious_only=true')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            All flagged transactions <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">
                  <div className="flex items-center">
                    Risk Score <FieldTooltip field="risk_score" />
                  </div>
                </th>
                <th className="py-3 px-4">Primary Anomaly Reason</th>
                <th className="py-3 px-4">Case Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading warning alerts...
                  </td>
                </tr>
              ) : summary?.recent_warnings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                    No active suspicious transaction warnings at this time.
                  </td>
                </tr>
              ) : (
                summary?.recent_warnings.map((w) => (
                  <tr key={w.tx_id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      {w.tx_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{w.client_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{w.client_id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(w.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold font-mono text-white">
                      ₹{w.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <RiskGradeBadge grade={w.risk_grade} size="sm" />
                        <span className="font-mono text-slate-400">{w.risk_score}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                      {w.reasons[0] || 'Unusual behavioral deviation detected'}
                    </td>
                    <td className="py-3.5 px-4">
                      {w.case_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/10 text-teal-300 border border-teal-500/30">
                          {w.case_status}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No Case</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTxId(w.tx_id)}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded border border-emerald-500/20 transition-all"
                      >
                        Inspect Risk Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Report Modal */}
      <RiskReportModal
        txId={selectedTxId}
        onClose={() => setSelectedTxId(null)}
        onOpenCase={(txId, clientId) => {
          navigate(`/investigations?tx_id=${txId}`);
        }}
        onNotify={(txId, clientId) => {
          navigate(`/notifications?client_id=${clientId}&tx_id=${txId}`);
        }}
      />
    </div>
  );
};

