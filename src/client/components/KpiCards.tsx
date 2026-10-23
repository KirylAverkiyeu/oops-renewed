import React from 'react';
import { Flame, DollarSign, Calendar, ShieldAlert } from 'lucide-react';
import { KpiStats } from '../../types';

export interface KpiCardsProps {
  stats: KpiStats | null;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ stats }) => {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {/* 1. True Normalized Monthly Burn Rate */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all flex flex-col justify-between">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 sm:w-24 sm:h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
        <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">
            Monthly Burn
          </span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1">
          {stats ? (
            <div>
              <div className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
                {Object.entries(stats.monthlyBurnRate)
                  .filter(([_, val]) => val > 0)
                  .slice(0, 2)
                  .map(([curr, val]) => `${val.toFixed(2)} ${curr}`)
                  .join(' + ') || `0.00 ${stats.primaryCurrency}`}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 mt-1 line-clamp-1">
                Normalized 30-day rate
              </div>
            </div>
          ) : (
            <div className="h-6 sm:h-8 bg-slate-800 animate-pulse rounded"></div>
          )}
        </div>
      </div>

      {/* 2. Annual Spend Projection */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all flex flex-col justify-between">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 sm:w-24 sm:h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all"></div>
        <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">
            Annual Projection
          </span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1">
          {stats ? (
            <div>
              <div className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
                {Object.entries(stats.annualProjection)
                  .filter(([_, val]) => val > 0)
                  .slice(0, 2)
                  .map(([curr, val]) => `${val.toFixed(2)} ${curr}`)
                  .join(' + ') || `0.00 ${stats.primaryCurrency}`}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 mt-1 line-clamp-1">
                12-month commitment
              </div>
            </div>
          ) : (
            <div className="h-6 sm:h-8 bg-slate-800 animate-pulse rounded"></div>
          )}
        </div>
      </div>

      {/* 3. Due This Month */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all flex flex-col justify-between">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 sm:w-24 sm:h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
        <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">
            Due This Month
          </span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1">
          {stats ? (
            <div>
              <div className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
                {Object.entries(stats.dueThisMonth)
                  .filter(([_, val]) => val > 0)
                  .slice(0, 2)
                  .map(([curr, val]) => `${val.toFixed(2)} ${curr}`)
                  .join(' + ') || `0.00 ${stats.primaryCurrency}`}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 mt-1 line-clamp-1">
                Remaining this month
              </div>
            </div>
          ) : (
            <div className="h-6 sm:h-8 bg-slate-800 animate-pulse rounded"></div>
          )}
        </div>
      </div>

      {/* 4. Active Free Trials */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all flex flex-col justify-between">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
        <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">
            Free Trials
          </span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1">
          {stats ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white">
                  {stats.activeTrialsCount}
                </span>
                {stats.activeTrialsCount > 0 ? (
                  <span className="px-1.5 py-0.5 text-[9px] sm:text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[9px] sm:text-xs font-medium rounded-full bg-slate-800 text-slate-400">
                    None
                  </span>
                )}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 mt-1 line-clamp-1">
                {stats.urgentRenewalsCount > 0 ? (
                  <span className="text-rose-400 font-medium">
                    ⚠️ {stats.urgentRenewalsCount} due in ≤3d
                  </span>
                ) : (
                  <span>{stats.totalActiveCount} active trackers</span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-6 sm:h-8 bg-slate-800 animate-pulse rounded"></div>
          )}
        </div>
      </div>
    </section>
  );
};
