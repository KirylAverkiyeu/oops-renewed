import React from 'react';
import { 
  Calendar, 
  ExternalLink, 
  Bell, 
  RotateCw, 
  Pencil, 
  Archive, 
  ArchiveRestore, 
  Trash2 
} from 'lucide-react';
import { Subscription } from '../../types';

export interface SubscriptionRowProps {
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

export const SubscriptionRow: React.FC<SubscriptionRowProps> = ({
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
  // Urgency Badge & Visual indicator Logic
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

  return (
    <tr
      className={`hover:bg-slate-800/30 transition-colors ${
        !sub.active ? 'opacity-50 grayscale-[40%]' : ''
      }`}
    >
      {/* Name, Notes & Link */}
      <td className="py-4 px-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${urgencyDot}`}></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-tight">{sub.name}</span>
              {sub.is_trial && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Free Trial
                </span>
              )}
              {!sub.active && (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-slate-800 text-slate-400">
                  Archived
                </span>
              )}
            </div>
            {sub.notes && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{sub.notes}</p>
            )}
            {sub.cancel_url && (
              <a
                href={sub.cancel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 mt-1 transition-colors"
              >
                <span>Manage / Cancel Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </td>

      {/* Urgency & Timeline */}
      <td className="py-4 px-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-mono text-sm text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{sub.next_renewal_date}</span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-full border w-fit ${urgencyColor}`}>
            {urgencyText}
          </span>
        </div>
      </td>

      {/* Amount & Monthly Burn */}
      <td className="py-4 px-4">
        <div>
          <div className="text-sm font-bold font-mono text-white">
            {sub.amount.toFixed(2)} {sub.currency}
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {sub.billing_cycle === 'custom_days' ? `${sub.custom_cycle_days}d` : sub.billing_cycle}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            ~{monthlyNorm.toFixed(2)} {sub.currency}/mo
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="py-4 px-4">
        <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
          {sub.category}
        </span>
      </td>

      {/* Row Actions */}
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {/* Test Telegram Alert Button */}
          <button
            onClick={() => onTestAlert(sub)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors"
            title="Test Telegram Alert"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Advance Cycle / Roll Over Button */}
          <button
            onClick={() => onRollCycle(sub)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 transition-colors"
            title="Advance to next billing cycle"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Edit Button */}
          <button
            onClick={() => onEdit(sub)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 border border-slate-700 transition-colors"
            title="Edit Subscription"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Archive / Restore Button */}
          <button
            onClick={() => onToggleArchive(sub)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors"
            title={sub.active ? 'Archive Tracker' : 'Restore Tracker'}
          >
            {sub.active ? (
              <Archive className="w-4 h-4" />
            ) : (
              <ArchiveRestore className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(sub)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-colors"
            title="Delete permanently"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

