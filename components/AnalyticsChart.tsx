import React from 'react';
import { PageAnalyticsSummary } from '../types';
import { TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  summary: PageAnalyticsSummary;
  compact?: boolean;
}

export const AnalyticsChart: React.FC<Props> = ({ summary, compact = false }) => {
  const maxPageviews = Math.max(...summary.weeklyData.map(w => w.pageviews), 1);

  const TrendIcon = summary.trend === 'up' ? TrendingUp : summary.trend === 'down' ? TrendingDown : Minus;
  const trendColor = summary.trend === 'up' ? 'text-green-600' : summary.trend === 'down' ? 'text-red-600' : 'text-slate-400';

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Eye size={14} className="text-slate-400" />
        <span className="font-medium">{summary.totalPageviews.toLocaleString('de-DE')}</span>
        <TrendIcon size={12} className={trendColor} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-1">Seitenaufrufe (12 Wochen)</h4>
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-bold text-slate-900">
              {summary.totalPageviews.toLocaleString('de-DE')}
            </div>
            <div className="text-sm text-slate-500">
              ⌀ {summary.avgWeeklyPageviews.toLocaleString('de-DE')}/Woche
            </div>
          </div>
        </div>
        <div className={clsx(
          "flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium",
          summary.trend === 'up' && "bg-green-50 text-green-700",
          summary.trend === 'down' && "bg-red-50 text-red-700",
          summary.trend === 'stable' && "bg-slate-50 text-slate-600"
        )}>
          <TrendIcon size={16} />
          <span>{Math.abs(summary.trendPercentage)}%</span>
        </div>
      </div>

      <div className="relative h-32 flex items-end gap-0.5">
        {summary.weeklyData.map((week, index) => {
          const height = (week.pageviews / maxPageviews) * 100;
          return (
            <div
              key={index}
              className="flex-1 group relative"
            >
              <div
                className={clsx(
                  "w-full rounded-t transition-all duration-200",
                  week.pageviews > 0 ? "bg-blue-500 hover:bg-blue-600" : "bg-slate-200"
                )}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                <div className="bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  <div className="font-medium">{week.week}</div>
                  <div>{week.pageviews.toLocaleString('de-DE')} Aufrufe</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-slate-500 pt-1">
        <span>{summary.weeklyData[0]?.week}</span>
        <span>{summary.weeklyData[summary.weeklyData.length - 1]?.week}</span>
      </div>
    </div>
  );
};
