import { KpiStats, Category, CurrencyAmountSummary } from '../types.js';
import { daysUntil, normalizeMonthlyAmount, calculateAnnualAmount } from '../utils/date.js';
import { getAllSubscriptions } from './subscriptions.js';

export function getKpiStats(
  defaultCurrency: string = process.env.DEFAULT_CURRENCY || 'PLN'
): KpiStats {
  const subs             = getAllSubscriptions();
  const currentYearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  const monthlyBurnRate: CurrencyAmountSummary = {};
  const annualProjection: CurrencyAmountSummary = {};
  const dueThisMonth: CurrencyAmountSummary = {};
  const categoryBreakdown: Record<Category, number> = {
    Entertainment: 0,
    Infrastructure: 0,
    Utilities: 0,
    Insurance: 0,
    Trial: 0,
    Other: 0,
  };

  let activeTrialsCount   = 0;
  let totalActiveCount    = 0;
  let totalInactiveCount  = 0;
  let urgentRenewalsCount = 0;

  for (const sub of subs) {
    if (!sub.active) {
      totalInactiveCount++;
      continue;
    }

    totalActiveCount++;
    const curr = sub.currency;

    if (sub.is_trial) activeTrialsCount++;

    categoryBreakdown[sub.category] = (categoryBreakdown[sub.category] ?? 0) + 1;

    const monthly = normalizeMonthlyAmount(sub.amount, sub.billing_cycle, sub.custom_cycle_days);
    monthlyBurnRate[curr] = (monthlyBurnRate[curr] || 0) + monthly;

    const annual = calculateAnnualAmount(sub.amount, sub.billing_cycle, sub.custom_cycle_days);
    annualProjection[curr] = (annualProjection[curr] || 0) + annual;

    if (sub.next_renewal_date.startsWith(currentYearMonth)) {
      dueThisMonth[curr] = (dueThisMonth[curr] || 0) + sub.amount;
    }

    if (daysUntil(sub.next_renewal_date) <= 3) {
      urgentRenewalsCount++;
    }
  }

  // Guarantee default currency always appears in results (avoids empty UI state)
  monthlyBurnRate[defaultCurrency]  ||= 0;
  annualProjection[defaultCurrency] ||= 0;
  dueThisMonth[defaultCurrency]     ||= 0;

  return {
    monthlyBurnRate,
    annualProjection,
    dueThisMonth,
    activeTrialsCount,
    totalActiveCount,
    totalInactiveCount,
    urgentRenewalsCount,
    categoryBreakdown,
    primaryCurrency: defaultCurrency,
  };
}

