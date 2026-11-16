import React, { useState } from 'react';
import { Info } from 'lucide-react';

const DEFINITIONS: Record<string, { title: string; range: string; desc: string }> = {
  risk_score: {
    title: "Calibrated Risk Score",
    range: "0.00 – 100.00",
    desc: "Composite risk assessment blending amount deviation (35%), daily velocity (25%), location consistency (15%), recipient trust (15%), and payment timing (10%) plus machine learning anomaly signal. A high score flags suspicion for human review, NOT confirmed fraud."
  },
  risk_grade: {
    title: "Risk Severity Grade",
    range: "NORMAL (<40) | LOW (40-59) | HIGH (60-79) | CRITICAL (80-100)",
    desc: "Continuous categorical tier determined by the composite risk score without overlaps or gaps. Grades >= HIGH automatically generate warning alerts."
  },
  anomaly_score: {
    title: "IsolationForest ML Anomaly Score",
    range: "0.00 – 100.00",
    desc: "Unsupervised multidimensional anomaly detection trained on transaction amount, velocity, daily sum, and time of day against normal customer history."
  },
  daily_tx_count: {
    title: "Daily Transaction Velocity",
    range: "Integer count (>= 1)",
    desc: "Cumulative count of transactions initiated by this customer on the active calendar date. Sharp velocity bursts frequently indicate automated card testing or credential compromise."
  },
  daily_tx_total: {
    title: "Daily Cumulative Volume",
    range: "INR (₹)",
    desc: "Total financial spend completed by the customer on this date including current transaction. Compared directly with 30-day baseline average daily spend."
  },
  forecast_deviation: {
    title: "TimesFM Spending Deviation",
    range: "INR (₹ difference)",
    desc: "Delta between actual cumulative daily spending and the projected 7-day spending model. Highlights sudden macro deviations from expected spending cadence."
  }
};

interface Props {
  field: keyof typeof DEFINITIONS;
  className?: string;
}

export const FieldTooltip: React.FC<Props> = ({ field, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const def = DEFINITIONS[field];

  if (!def) return null;

  return (
    <div className={`relative inline-flex items-center ml-1 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
        aria-label={`Information about ${def.title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-72 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-left pointer-events-none">
          <div className="font-semibold text-xs text-emerald-400 mb-1">{def.title}</div>
          <div className="text-[11px] text-slate-400 mb-1 font-mono">Range: {def.range}</div>
          <div className="text-xs text-slate-300 leading-relaxed">{def.desc}</div>
        </div>
      )}
    </div>
  );
};

