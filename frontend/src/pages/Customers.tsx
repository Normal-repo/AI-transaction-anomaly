import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCheck, AlertTriangle, ShieldCheck, ArrowRight, UserCog } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../api/client';
import { CustomerEditModal } from '../components/CustomerEditModal';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();

  const loadCustomers = () => {
    setLoading(true);
    api.getClients(search)
      .then(res => setCustomers(res.items))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Customer Intelligence & Profiles</h1>
          <p className="text-sm text-slate-400 mt-1">
            Historical behavioral baselines, typical activity centers, and individual risk profiles.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Name / Contact</th>
                <th className="py-3 px-4 text-right">Avg Daily Spend</th>
                <th className="py-3 px-4 text-center">Avg Tx / Day</th>
                <th className="py-3 px-4">Typical Region</th>
                <th className="py-3 px-4 text-center">Flagged Anomalies</th>
                <th className="py-3 px-4">Warning Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading customer profiles...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.client_id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      {c.client_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.email || c.phone || 'No direct contact'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-400">
                      ₹{c.avg_daily_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                      {c.avg_daily_tx_count.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-400">
                      {c.typical_locations.join(', ') || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {(c.suspicious_tx_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-400 font-mono">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {c.suspicious_tx_count}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.has_active_warning ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Active Warning
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setEditCustomer(c)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                        title="Edit profile with audit record"
                      >
                        <UserCog className="w-3.5 h-3.5 inline mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => navigate(`/customers/${c.client_id}`)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded border border-emerald-500/20 transition-all"
                      >
                        Details <ArrowRight className="w-3 h-3 inline ml-0.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <CustomerEditModal
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
        onSuccess={loadCustomers}
      />
    </div>
  );
};

