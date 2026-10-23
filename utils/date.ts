import { BillingCycle } from '../types.js';

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a Date object at midnight local time
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Calculates whole days remaining until the target date.
 * Returns negative numbers for past dates, 0 for today, positive for future dates.
 */
export function daysUntil(targetDateStr: string, fromDate: Date = new Date()): number {
  const fromStr = formatDate(fromDate);
  const from = parseDate(fromStr);
  const target = parseDate(targetDateStr);
  
  const diffMs = target.getTime() - from.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Advances a renewal date by exactly one billing cycle.
 * Clamps days to end-of-month if needed (e.g. Jan 31 + 1 month -> Feb 28/29).
 */
export function advanceDateByCycle(
  currentDateStr: string,
  cycle: BillingCycle,
  customDays?: number | null
): string {
  const d = parseDate(currentDateStr);
  const origDay = d.getDate();

  switch (cycle) {
    case 'monthly': {
      d.setMonth(d.getMonth() + 1);
      // If day rolled over (e.g., Feb has fewer days), clamp to last day of expected month
      if (d.getDate() !== origDay) {
        d.setDate(0);
      }
      break;
    }
    case 'quarterly': {
      d.setMonth(d.getMonth() + 3);
      if (d.getDate() !== origDay) {
        d.setDate(0);
      }
      break;
    }
    case 'yearly': {
      d.setFullYear(d.getFullYear() + 1);
      // Handle leap year Feb 29 -> Feb 28
      if (d.getDate() !== origDay) {
        d.setDate(0);
      }
      break;
    }
    case 'custom_days': {
      const days = customDays && customDays > 0 ? customDays : 30;
      d.setDate(d.getDate() + days);
      break;
    }
    default:
      d.setMonth(d.getMonth() + 1);
  }

  return formatDate(d);
}

/**
 * For auto-rollover: if a date is strictly before today, advances it repeatedly
 * until it is >= today.
 */
export function advanceDatePastToday(
  currentDateStr: string,
  cycle: BillingCycle,
  customDays?: number | null,
  todayStr: string = formatDate()
): string {
  let nextDate = currentDateStr;
  let iterations = 0;
  // Safety guard against infinite loop
  while (nextDate < todayStr && iterations < 120) {
    nextDate = advanceDateByCycle(nextDate, cycle, customDays);
    iterations++;
  }
  return nextDate;
}

/**
 * Normalizes any billing cycle amount to a 1-month equivalent cost.
 */
export function normalizeMonthlyAmount(
  amount: number,
  cycle: BillingCycle,
  customDays?: number | null
): number {
  if (amount <= 0) return 0;
  switch (cycle) {
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    case 'custom_days': {
      const days = customDays && customDays > 0 ? customDays : 30;
      return amount * (30.4375 / days);
    }
    default:
      return amount;
  }
}

/**
 * Computes annual commitment for a given subscription.
 */
export function calculateAnnualAmount(
  amount: number,
  cycle: BillingCycle,
  customDays?: number | null
): number {
  return normalizeMonthlyAmount(amount, cycle, customDays) * 12;
}

