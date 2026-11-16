import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ShieldAlert,
  BellRing,
  ScrollText,
  Activity,
  BookOpen
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/transactions', label: 'Transactions', icon: CreditCard },
    { to: '/investigations', label: 'Investigations', icon: ShieldAlert },
    { to: '/notifications', label: 'Notifications', icon: BellRing },
    { to: '/audit', label: 'Audit Trail', icon: ScrollText },
    { to: '/about', label: 'About & Formula', icon: BookOpen },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950">
          <Activity className="w-5 h-5 text-slate-950 font-bold" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            BankGuard <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">AI</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Risk & Anomaly Monitor</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Backend & Model Status Indicator */}
      <div className="p-4 border-t border-slate-800 text-[11px] space-y-2 text-slate-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            FastAPI Engine
          </span>
          <span className="text-emerald-400 font-mono text-[10px]">Active</span>
        </div>
        <div className="flex items-center justify-between">
          <span>TimesFM + Rules</span>
          <span className="text-slate-300 font-mono text-[10px]">v1.0</span>
        </div>
        <div className="pt-1 text-[10px] text-slate-500">
          Local SQLite Mode
        </div>
      </div>
    </aside>
  );
};
