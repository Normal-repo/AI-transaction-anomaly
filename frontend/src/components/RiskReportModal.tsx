import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle, User, Calendar, MapPin, DollarSign, Send, FileSearch } from 'lucide-react';
import { RiskReport } from '../types';
import { api } from '../api/client';
import { RiskGradeBadge } from './RiskGradeBadge';
import { FieldTooltip } from './FieldTooltip';

interface Props {
  txId: string | null;
  onClose: () => void;
  onOpenCase?: (txId: string, clientId: string) => void;
  onNotify?: (txId: string, clientId: string) => void;
}

export const RiskReportModal: React.FC<Props> = ({ txId, onClose, onOpenCase, onNotify }) => {
  const [report, setReport] = useState<RiskReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!txId) {
      setReport(null);
      return;
    }
    setLoading(true);
    setError(null);
    api.getRiskReport(txId)
      .then(data => setReport(data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load risk report.'))
      .finally(() => setLoading(false));
  }, [txId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!txId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Transaction Risk & Anomaly Assessment
              </h2>
              <p className="text-xs text-slate-400 font-mono">Reference ID: {txId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {loading && (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Generating calibrated multi-signal evaluation...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {report && (
            <>
              {/* Critical Legal/Analyst Disclaimer */}
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <span className="font-semibold text-amber-300">Analyst Advisory: </span>
                  {report.disclaimer}
                </div>
              </div>

              {/* Transaction Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400">Customer ID</div>
                  <div className="text-sm font-semibold text-white font-mono mt-0.5">{report.client_id}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400">Transaction Amount</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">₹{report.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400 flex items-center">
                    Risk Score <FieldTooltip field="risk_score" />
                  </div>
                  <div className="text-lg font-extrabold text-white mt-0.5 flex items-center gap-2">
                    {report.risk_score}
                    <span className="text-xs font-normal text-slate-500">/ 100</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-xs text-slate-400 flex items-center">
                    Risk Grade <FieldTooltip field="risk_grade" />
                  </div>
                  <div className="mt-1">
                    <RiskGradeBadge grade={report.risk_grade} size="md" />
                  </div>
                </div>
              </div>

              {/* Score Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Normal (0–39)</span>
                  <span>Low (40–59)</span>
                  <span>High (60–79)</span>
                  <span>Critical (80–100)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-500 ${
                      report.risk_grade === 'CRITICAL' ? 'bg-rose-500' :
                      report.risk_grade === 'HIGH' ? 'bg-amber-500' :
                      report.risk_grade === 'LOW' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, report.risk_score))}%` }}
                  ></div>
                </div>
              </div>

              {/* Evidence-Based Flagging Reasons */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-emerald-400" />
                  Contributing Evidence & Flagging Reasons
                </h3>
                <div className="space-y-1.5">
                  {report.reasons.map((reason, i) => (
                    <div key={i} className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs text-slate-300 flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contributing Signal Components */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-200">Calculated Behavioral Signals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {report.signals.map((sig, i) => (
                    <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-200">{sig.name}</span>
                        <span className={`font-mono font-semibold ${
                          sig.score > 60 ? 'text-rose-400' : sig.score > 30 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {sig.score} / 100
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{sig.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Baseline Comparison Context */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Customer Baseline Profile Context
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Avg Daily Spend:</span>
                    <div className="font-semibold text-white">₹{report.baseline_comparison.avg_daily_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Typical Locations:</span>
                    <div className="font-semibold text-white truncate">
                      {report.baseline_comparison.typical_locations.join(', ') || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Trusted Counterparties:</span>
                    <div className="font-semibold text-white truncate">
                      {report.baseline_comparison.trusted_recipients.slice(0, 3).join(', ') || 'None established'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">TimesFM 7-Day Forecast:</span>
                    <div className="font-semibold text-emerald-400">
                      ₹{report.forecast_context.predicted_daily_spend ? report.forecast_context.predicted_daily_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Actual Today's Total:</span>
                    <div className="font-semibold text-white">
                      ₹{report.forecast_context.actual_daily_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Forecast Deviation:</span>
                    <div className={`font-semibold ${report.forecast_context.deviation > 100 ? 'text-amber-400' : 'text-slate-300'}`}>
                      +₹{report.forecast_context.deviation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close Report
          </button>
          <div className="flex gap-2">
            {report && onNotify && (
              <button
                onClick={() => {
                  onClose();
                  onNotify(report.tx_id, report.client_id);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Alert
              </button>
            )}
            {report && onOpenCase && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCase(report.tx_id, report.client_id);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-colors"
              >
                <FileSearch className="w-3.5 h-3.5" />
                Open Investigation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

