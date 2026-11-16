import React, { useState } from 'react';
import {
  HelpCircle,
  Calculator,
  Shield,
  Layers,
  Cpu,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Sparkles,
  Lock,
  Compass,
  Sliders
} from 'lucide-react';
import { RiskGradeBadge } from '../components/RiskGradeBadge';

export const About: React.FC = () => {
  // Interactive Simulator State
  const [simAmountRatio, setSimAmountRatio] = useState<number>(1.2);
  const [simVelocityRatio, setSimVelocityRatio] = useState<number>(1.0);
  const [simIsNewLoc, setSimIsNewLoc] = useState<boolean>(false);
  const [simIsNewRecipient, setSimIsNewRecipient] = useState<boolean>(false);
  const [simIsOffHours, setSimIsOffHours] = useState<boolean>(false);
  const [simIForestScore, setSimIForestScore] = useState<number>(15);

  // Compute Heuristic Components
  // 1. Amount Deviation (0.35)
  let amountScore = 5.0;
  if (simAmountRatio > 10.0) amountScore = 95.0;
  else if (simAmountRatio > 5.0) amountScore = 80.0;
  else if (simAmountRatio > 2.5) amountScore = 55.0;
  else if (simAmountRatio > 1.5) amountScore = 30.0;
  else amountScore = 5.0;

  // 2. Velocity & Frequency (0.25)
  let velocityScore = 10.0;
  if (simVelocityRatio >= 4.0) velocityScore = 90.0;
  else if (simVelocityRatio >= 2.5) velocityScore = 65.0;
  else if (simVelocityRatio >= 1.5) velocityScore = 35.0;
  else velocityScore = 10.0;

  // 3. Location Familiarity (0.15)
  const locationScore = simIsNewLoc ? 75.0 : 0.0;

  // 4. Recipient Trustworthiness (0.15)
  const recipientScore = simIsNewRecipient ? 70.0 : 0.0;

  // 5. Method & Timing (0.10)
  const methodScore = simIsOffHours ? 80.0 : 0.0;

  // Weighted Heuristic Total
  const heuristicScore =
    amountScore * 0.35 +
    velocityScore * 0.25 +
    locationScore * 0.15 +
    recipientScore * 0.15 +
    methodScore * 0.10;

  // Blended Total (80% Heuristic + 20% IsolationForest)
  const blendedScore = Math.min(100, Math.max(0, heuristicScore * 0.8 + simIForestScore * 0.2));
  const roundedBlended = Math.round(blendedScore * 10) / 10;

  // Grade Assignment
  let simulatedGrade = 'NORMAL';
  if (roundedBlended < 40.0) simulatedGrade = 'NORMAL';
  else if (roundedBlended < 60.0) simulatedGrade = 'LOW';
  else if (roundedBlended < 80.0) simulatedGrade = 'HIGH';
  else simulatedGrade = 'CRITICAL';

  const isSuspicious = roundedBlended >= 60.0;

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <Shield className="w-4 h-4" /> System Architecture & Methodology
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            BankGuard AI Risk Scoring & Anomaly Detection Framework
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            A transparent, multi-signal risk rating architecture engineered specifically for Indian banking payment rails (UPI, IMPS, RTGS, Netbanking, Cards).
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
          <span>Engine:</span>
          <span className="text-emerald-400 font-semibold">Hybrid Heuristic + TimesFM + IForest</span>
        </div>
      </div>

      {/* Core Equation Banner */}
      <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Calculator className="w-4 h-4 text-emerald-400" />
          Mathematical Formula for Live Transaction Risk Scoring
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          BankGuard AI utilizes a two-tier hybrid model that combines explainable heuristic behavioural deviation with an unsupervised Isolation Forest anomaly score:
        </p>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs sm:text-sm text-emerald-300 overflow-x-auto shadow-inner">
          <div className="font-bold text-white mb-1.5">
            S<sub>total</sub> = 0.80 × S<sub>heuristic</sub> + 0.20 × S<sub>IForest</sub>
          </div>
          <div className="text-slate-400 text-xs">
            where: S<sub>heuristic</sub> = 0.35 · s<sub>amount</sub> + 0.25 · s<sub>velocity</sub> + 0.15 · s<sub>location</sub> + 0.15 · s<sub>recipient</sub> + 0.10 · s<sub>method_timing</sub>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
            <div className="text-[11px] text-slate-400 font-medium">80% Heuristic Baseline</div>
            <div className="text-xs text-slate-200 mt-0.5">Transparent, rule-backed customer behavioral profiling.</div>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
            <div className="text-[11px] text-slate-400 font-medium">20% IsolationForest ML</div>
            <div className="text-xs text-slate-200 mt-0.5">Unsupervised multi-dimensional density outlier detection.</div>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
            <div className="text-[11px] text-slate-400 font-medium">TimesFM 7-Day Horizon</div>
            <div className="text-xs text-slate-200 mt-0.5">Outlier-dampened forward daily spending baseline.</div>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
            <div className="text-[11px] text-slate-400 font-medium">100% Zero Ground-Truth Leak</div>
            <div className="text-xs text-emerald-400 font-semibold mt-0.5">No fraud labels consumed during inference.</div>
          </div>
        </div>
      </div>

      {/* Interactive Risk Score Simulator */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Interactive Risk Score & Grade Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust transaction variables below to observe how the mathematical formula weights inputs in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Simulated Score</div>
              <div className="text-2xl font-black font-mono text-white">
                {roundedBlended} <span className="text-xs text-slate-500 font-normal">/ 100</span>
              </div>
            </div>
            <RiskGradeBadge grade={simulatedGrade} size="lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Column */}
          <div className="space-y-5">
            {/* Amount Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Amount Deviation Ratio (Weight: 35%)
                </span>
                <span className="font-mono text-emerald-400 font-bold">{simAmountRatio}x baseline avg</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="12.0"
                step="0.5"
                value={simAmountRatio}
                onChange={(e) => setSimAmountRatio(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-950 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.5x (Safe)</span>
                <span>2.5x (Elevated)</span>
                <span>5.0x (High)</span>
                <span>10.0x+ (Severe)</span>
              </div>
            </div>

            {/* Velocity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Daily Velocity & Frequency (Weight: 25%)
                </span>
                <span className="font-mono text-indigo-400 font-bold">{simVelocityRatio}x normal daily frequency</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={simVelocityRatio}
                onChange={(e) => setSimVelocityRatio(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-950 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1.0x (Normal)</span>
                <span>2.5x (Rapid)</span>
                <span>4.0x+ (Spike)</span>
              </div>
            </div>

            {/* Isolation Forest Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  IsolationForest Anomaly Score (Weight: 20%)
                </span>
                <span className="font-mono text-blue-400 font-bold">{simIForestScore} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={simIForestScore}
                onChange={(e) => setSimIForestScore(parseInt(e.target.value))}
                className="w-full accent-blue-500 bg-slate-950 rounded cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={simIsNewLoc}
                  onChange={(e) => setSimIsNewLoc(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">New Geolocation</div>
                  <div className="text-[10px] text-slate-400">Weight: 15%</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={simIsNewRecipient}
                  onChange={(e) => setSimIsNewRecipient(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">New Counterparty</div>
                  <div className="text-[10px] text-slate-400">Weight: 15%</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={simIsOffHours}
                  onChange={(e) => setSimIsOffHours(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">Off-Hours (Night)</div>
                  <div className="text-[10px] text-slate-400">Weight: 10%</div>
                </div>
              </label>
            </div>
          </div>

          {/* Real-Time Outcome Column */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Simulated Output & Evidence Summary
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Heuristic Component (80%):</span>
                  <span className="font-mono font-semibold text-white">{heuristicScore.toFixed(1)} / 100</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">IsolationForest Component (20%):</span>
                  <span className="font-mono font-semibold text-blue-400">{simIForestScore.toFixed(1)} / 100</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Final Calibrated Score:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{roundedBlended} / 100</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Assigned Risk Grade:</span>
                  <span className="font-bold text-white">{simulatedGrade}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Flagged for Analyst Review:</span>
                  <span className={`font-bold ${isSuspicious ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isSuspicious ? 'YES (Suspicious Anomaly)' : 'NO (Normal Baseline)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Generated Audit Justifications */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
              <div className="text-[11px] font-semibold text-slate-300">Generated Analyst Findings:</div>
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
                {simAmountRatio > 2.5 && (
                  <li>Transaction amount is {simAmountRatio}x higher than typical single purchase.</li>
                )}
                {simVelocityRatio >= 2.5 && (
                  <li>Rapid velocity spike ({simVelocityRatio}x above customer normal daily frequency).</li>
                )}
                {simIsNewLoc && <li>Transaction originated from outside regular activity centers.</li>}
                {simIsNewRecipient && <li>Counterparty recipient has no prior transaction history with this account.</li>}
                {simIsOffHours && <li>High-value transfer initiated during nocturnal hours (23:00 - 05:00).</li>}
                {!simIsNewLoc && !simIsNewRecipient && !simIsOffHours && simAmountRatio <= 1.5 && (
                  <li className="text-emerald-400">All features align with verified behavioral baseline.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Weights & Thresholds Reference Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Signal Weights Table */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Signal Breakdown & Heuristic Weight Allocation
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Signal Component</th>
                  <th className="py-2.5 px-3 text-right">Weight</th>
                  <th className="py-2.5 px-3">Evaluation Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Amount Deviation</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">35%</td>
                  <td className="py-2.5 px-3 text-slate-400">Ratio to customer's historical average single tx amount.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Daily Velocity & Count</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">25%</td>
                  <td className="py-2.5 px-3 text-slate-400">Daily transaction count and cumulative daily spend vs mean.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Location Consistency</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">15%</td>
                  <td className="py-2.5 px-3 text-slate-400">Geolocation cluster check (neutral score for cold start).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Recipient History</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">15%</td>
                  <td className="py-2.5 px-3 text-slate-400">Verification against verified counterparty list.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Method & Timing</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">10%</td>
                  <td className="py-2.5 px-3 text-slate-400">Rare payment rail usage + nocturnal transfer penalty.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Continuous Risk Grades Table */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            Continuous Risk Grade Boundaries (Strictly No Gaps)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Grade</th>
                  <th className="py-2.5 px-3">Score Interval</th>
                  <th className="py-2.5 px-3">Operational Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-2.5 px-3">
                    <RiskGradeBadge grade="NORMAL" size="sm" />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">[0.0, 40.0)</td>
                  <td className="py-2.5 px-3 text-slate-400">Standard behavior. Auto-cleared without analyst friction.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">
                    <RiskGradeBadge grade="LOW" size="sm" />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">[40.0, 60.0)</td>
                  <td className="py-2.5 px-3 text-slate-400">Minor deviation (e.g. new recipient). Retained in ledger.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">
                    <RiskGradeBadge grade="HIGH" size="sm" />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">[60.0, 80.0)</td>
                  <td className="py-2.5 px-3 text-amber-300">Flagged suspicious. Escalated to queue for analyst triage.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">
                    <RiskGradeBadge grade="CRITICAL" size="sm" />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">[80.0, 100.0]</td>
                  <td className="py-2.5 px-3 text-rose-300 font-semibold">Severe anomaly. Immediate investigation & client alert.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Foundation Models & TimesFM Horizon Deep Dive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            TimesFM 7-Day Horizon
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Forecasts daily aggregated customer spending patterns using dampened Exponential Moving Average with outlier protection. Prevents a single fraudulent day from inflating baseline expectations.
          </p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Cpu className="w-4 h-4 text-indigo-400" />
            Isolation Forest (IForest)
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Lightweight decision tree ensemble isolating multivariate spatial anomalies across amount, transaction frequency, daily spend totals, and initiation hour.
          </p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Lock className="w-4 h-4 text-emerald-400" />
            Audit & Compliance Integrity
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every investigation decision, customer profile alteration, and outbound notification is permanently recorded with immutable timestamps, author identity, and mandatory rationale.
          </p>
        </div>
      </div>
    </div>
  );
};
