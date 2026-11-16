// src/components/StatsCard.js
import React from 'react';

const colorMap = {
  indigo: {
    bg: 'var(--primary-10)',
    icon: 'var(--primary)',
    border: 'var(--primary-30)',
    glow: 'rgba(99, 102, 241, 0.15)',
  },
  purple: {
    bg: 'rgba(168, 85, 247, 0.1)',
    icon: '#a855f7',
    border: 'rgba(168, 85, 247, 0.3)',
    glow: 'rgba(168, 85, 247, 0.15)',
  },
  pink: {
    bg: 'rgba(236, 72, 153, 0.1)',
    icon: '#ec4899',
    border: 'rgba(236, 72, 153, 0.3)',
    glow: 'rgba(236, 72, 153, 0.15)',
  },
  green: {
    bg: 'rgba(34, 197, 94, 0.1)',
    icon: '#22c55e',
    border: 'rgba(34, 197, 94, 0.3)',
    glow: 'rgba(34, 197, 94, 0.15)',
  },
  orange: {
    bg: 'rgba(249, 115, 22, 0.1)',
    icon: '#f97316',
    border: 'rgba(249, 115, 22, 0.3)',
    glow: 'rgba(249, 115, 22, 0.15)',
  },
};

export default function StatsCard({ title, value, icon, color = 'indigo', trend, trendLabel }) {
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div
      className="stats-card"
      style={{
        borderColor: colors.border,
        '--card-glow': colors.glow,
      }}
    >
      <div className="stats-card-top">
        <div
          className="stats-icon"
          style={{ background: colors.bg, color: colors.icon }}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={`stats-trend ${trend >= 0 ? 'up' : 'down'}`}
          >
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="stats-value">{value}</div>
      <div className="stats-title">{title}</div>

      {trendLabel && (
        <div className="stats-trend-label">{trendLabel}</div>
      )}
    </div>
  );
}
