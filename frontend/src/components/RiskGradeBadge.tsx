import React from 'react';

interface Props {
  grade: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL' | string;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskGradeBadge: React.FC<Props> = ({ grade, size = 'sm' }) => {
  const g = (grade || 'NORMAL').toUpperCase();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-bold',
  }[size];

  switch (g) {
    case 'CRITICAL':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          HIGH
        </span>
      );
    case 'LOW':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          LOW
        </span>
      );
    case 'NORMAL':
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          NORMAL
        </span>
      );
  }
};

