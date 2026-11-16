import React, { useEffect, useState } from 'react';
import { ScrollText, RefreshCw, Filter } from 'lucide-react';
import { AuditRecordItem } from '../types';
import { api } from '../api/client';

export const AuditTrail: React.FC = () => {
  const [audits, setAudits] = useState<AuditRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('ALL');

  const loadAudits = () => {
    setLoading(true);
    api.getAuditLogs(entityFilter)
      .then(res => setAudits(res.items))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAudits();
  }, [entityFilter]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Compliance & Operational Audit Log</h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable tracking of customer profile edits, case changes, and notifications.
          </p>
        </div>

        <button
          onClick={loadAudits}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-2 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
        {['ALL', 'CUSTOMER', 'TRANSACTION', 'CASE', 'NOTIFICATION'].map((ent) => (
          <button
            key={ent}
            onClick={() => setEntityFilter(ent)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              entityFilter === ent
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {ent}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Entity Identifier</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Changed By</th>
                <th className="py-3 px-4">Audit Reason / Justification</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : audits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                audits.map((a) => (
                  <tr key={a.audit_id} className="hover:bg-slate-850/50">
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      #{a.audit_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-emerald-400">
                        {a.entity_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white">
                      {a.entity_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {a.action}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {a.changed_by}
                    </td>
                    <td className="py-3.5 px-4 max-w-md text-slate-300">
                      {a.reason || 'Standard system event'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(a.changed_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

