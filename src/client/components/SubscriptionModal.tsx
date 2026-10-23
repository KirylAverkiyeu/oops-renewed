import React from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { Subscription, BillingCycle, Category, Currency } from '../../types';

export interface SubscriptionFormData {
  name: string;
  amount: number;
  currency: Currency | string;
  billing_cycle: BillingCycle;
  custom_cycle_days: number;
  next_renewal_date: string;
  remind_days_before: number;
  category: Category;
  is_trial: boolean;
  cancel_url: string;
  notes: string;
  active: boolean;
}

export interface SubscriptionModalProps {
  isOpen: boolean;
  editingSub: Subscription | null;
  formData: SubscriptionFormData;
  onFormChange: (data: SubscriptionFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  categories: Category[];
  currencies: (Currency | string)[];
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  editingSub,
  formData,
  onFormChange,
  onSubmit,
  onClose,
  categories,
  currencies,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              {editingSub ? <Pencil className="w-4 h-4 sm:w-5 sm:h-5" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {editingSub ? `Edit: ${editingSub.name}` : 'Add Recurring Payment'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Configure renewal parameters & triggers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Form (scrollable body) */}
        <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Subscription Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Netflix, Cloudflare, Insurance"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-base sm:text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.amount}
                onChange={(e) => onFormChange({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-base sm:text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">Set 0 for free trials</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Currency *
              </label>
              <select
                value={formData.currency}
                onChange={(e) => onFormChange({ ...formData, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-base sm:text-sm focus:outline-none focus:border-emerald-500"
              >
                {currencies.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Billing Cycle & Custom Days / Remind Days */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Billing Cycle *
              </label>
              <select
                value={formData.billing_cycle}
                onChange={(e) => {
                  const newCycle = e.target.value as BillingCycle;
                  onFormChange({
                    ...formData,
                    billing_cycle: newCycle,
                    remind_days_before: newCycle === 'yearly' ? 5 : 2,
                  });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-base sm:text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (3 Months)</option>
                <option value="yearly">Yearly</option>
                <option value="custom_days">Custom Days Interval</option>
              </select>
            </div>

            {formData.billing_cycle === 'custom_days' ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Days In Cycle *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.custom_cycle_days}
                  onChange={(e) =>
                    onFormChange({ ...formData, custom_cycle_days: parseInt(e.target.value, 10) || 30 })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-base sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Alert Window (Days Before) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  value={formData.remind_days_before}
                  onChange={(e) =>
                    onFormChange({ ...formData, remind_days_before: parseInt(e.target.value, 10) || 2 })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-base sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Next Renewal Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Next Renewal Date *
              </label>
              <input
                type="date"
                required
                value={formData.next_renewal_date}
                onChange={(e) => onFormChange({ ...formData, next_renewal_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-base sm:text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => onFormChange({ ...formData, category: e.target.value as Category })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-base sm:text-sm focus:outline-none focus:border-emerald-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Free Trial Toggle */}
          <div className="flex items-center gap-3 p-3 sm:p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <input
              type="checkbox"
              id="is_trial"
              checked={formData.is_trial}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  is_trial: e.target.checked,
                  category: e.target.checked ? 'Trial' : formData.category,
                })
              }
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-900 border-slate-700 cursor-pointer shrink-0"
            />
            <label htmlFor="is_trial" className="text-xs sm:text-sm font-medium text-slate-200 cursor-pointer">
              Is Free Trial?{' '}
              <span className="text-[11px] sm:text-xs text-slate-400 block font-normal mt-0.5">
                Triggers high-priority alerts before card billing starts.
              </span>
            </label>
          </div>

          {/* Direct Cancel URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Direct Cancellation URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://service.com/account/billing"
              value={formData.cancel_url}
              onChange={(e) => onFormChange({ ...formData, cancel_url: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-base sm:text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Notes / Shared With (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Account login hint, shared cardholder, or caveats"
              value={formData.notes}
              onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-base sm:text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 sm:px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              {editingSub ? 'Save Changes' : 'Create Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
