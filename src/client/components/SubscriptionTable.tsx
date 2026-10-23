import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Subscription, BillingCycle } from '../../types';
import { SubscriptionRow } from './SubscriptionRow';
import { SubscriptionCard } from './SubscriptionCard';

export interface SubscriptionTableProps {
  subscriptions: Subscription[];
  actionLoadingId: number | null;
  onTestAlert: (sub: Subscription) => void;
  onRollCycle: (sub: Subscription) => void;
  onEdit: (sub: Subscription) => void;
  onToggleArchive: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => void;
  onOpenAdd: () => void;
  calculateDaysUntil: (dateStr: string) => number;
  calculateNormalized: (amount: number, cycle: BillingCycle, customDays?: number | null) => number;
}

export const SubscriptionTable: React.FC<SubscriptionTableProps> = ({
  subscriptions,
  actionLoadingId,
  onTestAlert,
  onRollCycle,
  onEdit,
  onToggleArchive,
  onDelete,
  onOpenAdd,
  calculateDaysUntil,
  calculateNormalized,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
      {/* Table / List Header Section */}
      <div className="p-3.5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>Renewal Timeline & Inventory</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400 font-mono">
              {subscriptions.length}
            </span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Chronologically ordered by days remaining until next renewal hit
          </p>
        </div>
      </div>

      {subscriptions.length === 0 ? (
        <div className="py-12 sm:py-16 text-center text-slate-500 px-4">
          <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto stroke-[1.2] text-slate-600 mb-3" />
          <p className="text-sm sm:text-base font-medium text-slate-400">
            No subscriptions match your criteria
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Adjust your filters or add a new recurring payment.
          </p>
          <button
            onClick={onOpenAdd}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 inline-flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Subscription
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Card List (< md breakpoint) */}
          <div className="md:hidden divide-y divide-slate-800/60">
            {subscriptions.map((sub) => {
              const days = calculateDaysUntil(sub.next_renewal_date);
              const monthlyNorm = calculateNormalized(
                sub.amount,
                sub.billing_cycle,
                sub.custom_cycle_days
              );
              const isLoading = actionLoadingId === sub.id;

              return (
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  days={days}
                  monthlyNorm={monthlyNorm}
                  isLoading={isLoading}
                  onTestAlert={onTestAlert}
                  onRollCycle={onRollCycle}
                  onEdit={onEdit}
                  onToggleArchive={onToggleArchive}
                  onDelete={onDelete}
                />
              );
            })}
          </div>

          {/* Desktop Data Table (>= md breakpoint) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 sm:px-6">Subscription / Service</th>
                  <th className="py-3 px-4">Urgency & Timeline</th>
                  <th className="py-3 px-4">Billing & Cadence</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {subscriptions.map((sub) => {
                  const days = calculateDaysUntil(sub.next_renewal_date);
                  const monthlyNorm = calculateNormalized(
                    sub.amount,
                    sub.billing_cycle,
                    sub.custom_cycle_days
                  );
                  const isLoading = actionLoadingId === sub.id;

                  return (
                    <SubscriptionRow
                      key={sub.id}
                      sub={sub}
                      days={days}
                      monthlyNorm={monthlyNorm}
                      isLoading={isLoading}
                      onTestAlert={onTestAlert}
                      onRollCycle={onRollCycle}
                      onEdit={onEdit}
                      onToggleArchive={onToggleArchive}
                      onDelete={onDelete}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
