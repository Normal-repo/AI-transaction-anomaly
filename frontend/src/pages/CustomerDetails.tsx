import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  CreditCard,
  MapPin,
  TrendingUp,
  AlertTriangle,
  UserCog,
  Calendar,
  Layers,
  BarChart2,
  Activity,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
  Line
} from 'recharts';
import { Customer, Transaction, CustomerAnalytics } from '../types';
import { api } from '../api/client';
import { RiskGradeBadge } from '../components/RiskGradeBadge';
import { RiskReportModal } from '../components/RiskReportModal';
import { CustomerEditModal } from '../components/CustomerEditModal';

// Clean custom tooltip that filters out null/undefined entries (avoids ₹0.00 glitch)
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const valid = payload.filter((p: any) => p.value !== null && p.value !== undefined && !isNaN(p.value));
  if (!valid.length) return null;

  return (
    <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-2xl text-xs space-y-1.5 min-w-[210px]">
      <p className="font-semibold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between">
        <span>{payload[0]?.payload?.fullDate || label}</span>
        <span className="text-[10px] text-slate-500 font-normal">
          {payload[0]?.payload?.historical_spend !== null ? 'Historical' : 'TimesFM Projection'}
        </span>
      </p>
      {valid.map((item: any, idx: number) => {
        const isSpend = item.dataKey.toLowerCase().includes('spend');
        return (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color || item.fill || item.stroke }}></span>
              {item.name}:
            </span>
            <span className="font-mono font-bold text-white">
              {isSpend
                ? `₹${Number(item.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${item.value} tx`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const CustomerDetails: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [chartView, setChartView] = useState<'spend' | 'count' | 'combined'>('spend');

  const loadData = () => {
    if (!clientId) return;
    setLoading(true);
    Promise.all([
      api.getClient(clientId),
      api.getClientAnalytics(clientId),
      api.getClientTransactions(clientId, {
        grade: gradeFilter === 'ALL' ? undefined : gradeFilter,
        suspicious_only: suspiciousOnly,
        limit: 100
      })
    ])
      .then(([cust, an, txs]) => {
        setCustomer(cust);
        setAnalytics(an);
        setTransactions(txs.items);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [clientId, gradeFilter, suspiciousOnly]);

  if (!customer && !loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Customer not found.</p>
        <button onClick={() => navigate('/customers')} className="mt-4 text-emerald-400">
          Back to customers
        </button>
      </div>
    );
  }

  // Combine historical daily spending and TimesFM 7-day forecast seamlessly
  const historyList = analytics?.history || [];
  const forecastList = analytics?.forecast || [];
  const lastIndex = historyList.length - 1;

  // Compute summary stats
  const total30DaySpend = historyList.reduce((acc, h) => acc + h.spend, 0);
  const peakDaySpend = historyList.length > 0 ? Math.max(...historyList.map(h => h.spend)) : 0;
  const totalTxCount = historyList.reduce((acc, h) => acc + h.count, 0);
  const meanForecast = analytics?.forecast_meta?.mean_forecast || 0;

  const chartData = [
    ...historyList.map((h, i) => ({
      date: h.date.slice(5),
      fullDate: h.date,
      historical_spend: h.spend,
      tx_count: h.count,
      // Seamlessly bridge: assign last historical spend as starting point for forecast curve
      forecasted_spend: i === lastIndex ? h.spend : (null as number | null)
    })),
    ...forecastList.map(f => ({
      date: f.date.slice(5),
      fullDate: f.date,
      historical_spend: null as number | null,
      tx_count: null as number | null,
      forecasted_spend: f.predicted_spend
    }))
  ];

  const formatINR = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top back navigation */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      {/* Profile Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{customer?.name}</h1>
              <span className="text-xs font-mono px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 rounded">
                {customer?.client_id}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>Email: <strong className="text-slate-200">{customer?.email || 'N/A'}</strong></span>
              <span>Phone: <strong className="text-slate-200">{customer?.phone || 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowEditModal(true)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 self-start md:self-auto transition-colors"
        >
          <UserCog className="w-4 h-4" />
          Edit Profile (Audited)
        </button>
      </div>

      {/* Behavioral Baseline Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Baseline Avg Daily Spend</div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            ₹{customer?.avg_daily_spend ? customer.avg_daily_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Std Dev: ±₹{customer?.std_daily_spend ? customer.std_daily_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Daily Frequency Baseline</div>
          <div className="text-xl font-bold text-white font-mono">
            {customer?.avg_daily_tx_count.toFixed(1)} tx/day
          </div>
          <div className="text-[11px] text-slate-500">30-day historical mean</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Typical Activity Centers</div>
          <div className="text-xs font-semibold text-white truncate mt-1">
            {customer?.typical_locations.join(', ') || 'None'}
          </div>
          <div className="text-[11px] text-slate-500">Primary geolocation center</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Trusted Counterparties</div>
          <div className="text-xs font-semibold text-white truncate mt-1">
            {customer?.trusted_recipients.slice(0, 3).join(', ') || 'None'}
          </div>
          <div className="text-[11px] text-slate-500">Verified regular merchants</div>
        </div>
      </div>

      {/* Spending & Velocity Analytics Chart Section */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5 shadow-xl">
        {/* Chart Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Customer Daily Spending Pattern & TimesFM 7-Day Horizon
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical 30-day evaluated window with projected {analytics?.forecast_meta.model_name || 'TimesFM'} baseline.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs self-start md:self-auto">
            <button
              onClick={() => setChartView('spend')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                chartView === 'spend'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Daily Spending (₹)
            </button>
            <button
              onClick={() => setChartView('count')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                chartView === 'count'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tx Velocity (Count)
            </button>
            <button
              onClick={() => setChartView('combined')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                chartView === 'combined'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Combined View
            </button>
          </div>
        </div>

        {/* Quick Stat Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-800/60">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            <span className="text-[10px] text-slate-400 font-medium">30-Day Total Spending</span>
            <div className="text-sm font-bold font-mono text-white mt-0.5">
              ₹{total30DaySpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            <span className="text-[10px] text-slate-400 font-medium">Peak Single-Day Spend</span>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              ₹{peakDaySpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            <span className="text-[10px] text-slate-400 font-medium">30-Day Transactions</span>
            <div className="text-sm font-bold font-mono text-indigo-400 mt-0.5">
              {totalTxCount} transactions
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            <span className="text-[10px] text-slate-400 font-medium">TimesFM 7-Day Mean Projection</span>
            <div className="text-sm font-bold font-mono text-blue-400 mt-0.5">
              ₹{meanForecast.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / day
            </div>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="flex flex-wrap items-center gap-5 text-xs font-medium pt-1">
          {(chartView === 'spend' || chartView === 'combined') && (
            <>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-1 bg-emerald-400 rounded-sm"></span> Historical Daily Spend
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-3 h-0.5 bg-blue-400 border-dashed border-b"></span> TimesFM 7-Day Horizon
              </span>
            </>
          )}
          {(chartView === 'count' || chartView === 'combined') && (
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-3 h-3 bg-indigo-500/80 rounded-sm"></span> Daily Transaction Count
            </span>
          )}
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'spend' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickMargin={6} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={formatINR} />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="historical_spend"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#spendGrad)"
                  name="Historical Spend"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="forecasted_spend"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#fcGrad)"
                  name="Forecasted Spend"
                  connectNulls={false}
                />
              </AreaChart>
            ) : chartView === 'count' ? (
              <BarChart
                data={chartData.filter(d => d.tx_count !== null)}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickMargin={6} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="tx_count"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  name="Transactions Count"
                />
              </BarChart>
            ) : (
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="comboSpendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickMargin={6} />
                <YAxis
                  yAxisId="left"
                  stroke="#10b981"
                  fontSize={11}
                  tickFormatter={formatINR}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#818cf8"
                  fontSize={11}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  yAxisId="right"
                  dataKey="tx_count"
                  fill="#6366f1"
                  opacity={0.6}
                  radius={[4, 4, 0, 0]}
                  name="Transactions Count"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="historical_spend"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#comboSpendGrad)"
                  name="Historical Spend"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="forecasted_spend"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Forecasted Spend"
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Transactions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-4">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Customer Transaction History</h3>
            <p className="text-xs text-slate-400 mt-0.5">Filterable transaction audit for customer {clientId}.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Risk Grades</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={suspiciousOnly}
                onChange={(e) => setSuspiciousOnly(e.target.checked)}
                className="rounded border-slate-700 text-emerald-600 focus:ring-0"
              />
              Suspicious Flagged Only
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Risk Grade</th>
                <th className="py-3 px-4 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No transactions match filter criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.tx_id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">{tx.tx_id}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(tx.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">{tx.recipient}</td>
                    <td className="py-3.5 px-4 text-slate-400">{tx.location}</td>
                    <td className="py-3.5 px-4 text-slate-400">{tx.payment_method}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                      ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <RiskGradeBadge grade={tx.risk_grade} size="sm" />
                        <span className="font-mono text-slate-400">{tx.risk_score}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
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

      {/* Modals */}
      <RiskReportModal
        txId={selectedTxId}
        onClose={() => setSelectedTxId(null)}
        onOpenCase={(txId) => navigate(`/investigations?tx_id=${txId}`)}
        onNotify={(txId, cid) => navigate(`/notifications?client_id=${cid}&tx_id=${txId}`)}
      />

      {showEditModal && customer && (
        <CustomerEditModal
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
