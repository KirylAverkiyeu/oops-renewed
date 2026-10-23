import React from 'react';
import {
  Calendar,
  ExternalLink,
  Bell,
  RotateCw,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react';
import { Subscription } from '../../types';

export interface SubscriptionCardProps {
  sub: Subscription;
  days: number;
  monthlyNorm: number;
  isLoading: boolean;
  onTestAlert: (sub: Subscription) => void;
  onRollCycle: (sub: Subscription) => void;
  onEdit: (sub: Subscription) => void;
  onToggleArchive: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  sub,
  days,
  monthlyNorm,
  isLoading,
  onTestAlert,
  onRollCycle,
  onEdit,
  onToggleArchive,
  onDelete,
}) => {
  // Urgency visual badge logic
  let urgencyColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let urgencyText = `In ${days} days`;
  let urgencyDot = 'bg-emerald-400';

  if (sub.is_trial) {
    urgencyColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    urgencyDot = 'bg-rose-400 animate-ping';
  } else if (days < 0) {
    urgencyColor = 'bg-rose-950/80 text-rose-300 border-rose-800';
    urgencyText = `Overdue (${Math.abs(days)}d)`;
    urgencyDot = 'bg-rose-500';
  } else if (days === 0) {
    urgencyColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    urgencyText = 'Today!';
    urgencyDot = 'bg-rose-400 animate-pulse';
  } else if (days <= 3) {
    urgencyColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    urgencyText = `${days} days left`;
    urgencyDot = 'bg-rose-400';
  } else if (days <= 7) {
    urgencyColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    urgencyText = `${days} days left`;
    urgencyDot = 'bg-amber-400';
  }

  const cycleLabel =
    sub.billing_cycle === 'custom_days' ? `${sub.custom_cycle_days}d` : sub.billing_cycle;

  return (
    <div
      className={`p-4 transition-colors ${
        !sub.active ? 'opacity-60 grayscale-[30%] bg-slate-950/30' : 'bg-slate-900/40'
      }`}
    >
      {/* Top Header: Urgency Dot, Name, Category & Trial Pill */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${urgencyDot}`} />
          <div className="min-w-0">
            <h3 className="font-bold text-white text-base tracking-tight truncate">{sub.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-800 border border-slate-700/60 text-slate-300">
                {sub.category}
              </span>
              {sub.is_trial && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Free Trial
                </span>
              )}
              {!sub.active && (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  Archived
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Amount & Cycle */}
        <div className="text-right shrink-0">
          <div className="text-base font-bold font-mono text-white">
            {sub.amount.toFixed(2)} <span className="text-xs font-normal text-slate-400">{sub.currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            ~{monthlyNorm.toFixed(2)} {sub.currency}/mo
          </div>
        </div>
      </div>

      {/* Date & Urgency Row */}
      <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-slate-950/50 border border-slate-800/60 text-xs mb-3">
        <div className="flex items-center gap-1.5 text-slate-300 font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{sub.next_renewal_date}</span>
          <span className="text-slate-500">({cycleLabel})</span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${urgencyColor}`}
        >
          {urgencyText}
        </span>
      </div>

      {/* Notes or Cancel Link if present */}
      {(sub.notes || sub.cancel_url) && (
        <div className="mb-3 space-y-1 text-xs">
          {sub.notes && <p className="text-slate-400 italic line-clamp-2">“{sub.notes}”</p>}
          {sub.cancel_url && (
            <a
              href={sub.cancel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline pt-0.5"
            >
              <span>Manage / Cancel Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Touch-Friendly Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
        {/* Advance cycle button (Primary action) */}
        <button
          onClick={() => onRollCycle(sub)}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-300 border border-slate-700 text-xs font-medium transition-colors active:scale-98 disabled:opacity-50"
          title="Advance to next billing cycle"
        >
          <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Advance</span>
        </button>

        {/* Secondary actions row */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onTestAlert(sub)}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Test Telegram Alert"
            aria-label="Test Alert"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onClick={() => onEdit(sub)}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Edit Subscription"
            aria-label="Edit Subscription"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleArchive(sub)}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors disabled:opacity-50"
            title={sub.active ? 'Archive Tracker' : 'Restore Tracker'}
            aria-label={sub.active ? 'Archive' : 'Restore'}
          >
            {sub.active ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => onDelete(sub)}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-colors disabled:opacity-50"
            title="Delete permanently"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

