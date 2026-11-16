import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, ShieldAlert, ArrowUpDown, RefreshCw, FileSearch, Send } from 'lucide-react';
import { Transaction } from '../types';
import { api } from '../api/client';
import { RiskGradeBadge } from '../components/RiskGradeBadge';
import { FieldTooltip } from '../components/FieldTooltip';
import { RiskReportModal } from '../components/RiskReportModal';

export const Transactions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState(searchParams.get('client_id') || '');
  const [grade, setGrade] = useState(searchParams.get('grade') || 'ALL');
  const [suspiciousOnly, setSuspiciousOnly] = useState(searchParams.get('suspicious_only') === 'true');

  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const loadTransactions = () => {
    setLoading(true);
    api.getTransactions({
      client_id: clientId || undefined,
      grade: grade,
      suspicious_only: suspiciousOnly,
      search: search || undefined,
      limit: 100
    })
      .then(res => {
        setTransactions(res.items);
        setTotal(res.total);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTransactions();
  }, [clientId, grade, suspiciousOnly, search]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Financial Transaction Explorer</h1>
          <p className="text-sm text-slate-400 mt-1">
            Customer-oriented transaction stream with real-time AI anomaly evaluation.
          </p>
        </div>

        <button
          onClick={loadTransactions}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-2 self-start transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 shadow-lg">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search merchant, ID, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Customer Filter */}
        <div>
          <input
            type="text"
            placeholder="Filter by Customer ID (e.g. CUST-1001)..."
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Grade Filter */}
        <div>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Risk Grades</option>
            <option value="CRITICAL">Critical Severity (80–100)</option>
            <option value="HIGH">High Severity (60–79)</option>
            <option value="LOW">Low Severity (40–59)</option>
            <option value="NORMAL">Normal (under 40)</option>
          </select>
        </div>

        {/* Suspicious Toggle */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={suspiciousOnly}
              onChange={(e) => setSuspiciousOnly(e.target.checked)}
              className="rounded border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4"
            />
            Show Suspicious Warnings Only
          </label>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing <strong className="text-white">{transactions.length}</strong> of <strong className="text-white">{total}</strong> transactions</span>
          <span className="font-mono text-[11px]">Click any row or button to view complete explainable risk breakdown</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Counterparty / Recipient</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Payment Channel</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">
                  <div className="flex items-center">
                    Risk Score <FieldTooltip field="risk_score" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Querying banking transaction ledger...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.tx_id}
                    onClick={() => setSelectedTxId(tx.tx_id)}
                    className="hover:bg-slate-850/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      {tx.tx_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{tx.client_name || tx.client_id}</div>
                      <div className="text-[11px] font-mono text-slate-500">{tx.client_id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(tx.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                      {tx.recipient}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {tx.location}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px]">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <RiskGradeBadge grade={tx.risk_grade} size="sm" />
                        <span className="font-mono text-slate-400">{tx.risk_score}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {tx.is_suspicious ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          SUSPICIOUS
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          NORMAL
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedTxId(tx.tx_id)}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded border border-emerald-500/20 transition-all"
                      >
                        Risk Report
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
        onOpenCase={(txId, cid) => navigate(`/investigations?tx_id=${txId}`)}
        onNotify={(txId, cid) => navigate(`/notifications?client_id=${cid}&tx_id=${txId}`)}
      />
    </div>
  );
};
