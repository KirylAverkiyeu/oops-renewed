export enum Currency {
  PLN = 'PLN',
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
  CHF = 'CHF',
}

export const CURRENCIES = Object.values(Currency) as Currency[];

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom_days';

export type Category =
  | 'Entertainment'
  | 'Infrastructure'
  | 'Utilities'
  | 'Insurance'
  | 'Trial'
  | 'Other';

export interface Subscription {
  id: number;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  custom_cycle_days: number | null;
  next_renewal_date: string;
  remind_days_before: number;
  category: Category;
  is_trial: boolean;
  cancel_url: string | null;
  notes: string | null;
  active: boolean;
  last_reminded_for_cycle_date: string | null;
  created_at: string;
}

export type SubscriptionCreateInput = Omit<
  Subscription,
  'id' | 'created_at' | 'last_reminded_for_cycle_date'
> & {
  last_reminded_for_cycle_date?: string | null;
};

export type SubscriptionUpdateInput = Partial<SubscriptionCreateInput>;

export interface CurrencyAmountSummary {
  [currency: string]: number;
}

export interface KpiStats {
  monthlyBurnRate: CurrencyAmountSummary;
  annualProjection: CurrencyAmountSummary;
  dueThisMonth: CurrencyAmountSummary;
  activeTrialsCount: number;
  totalActiveCount: number;
  totalInactiveCount: number;
  urgentRenewalsCount: number;
  categoryBreakdown: Record<Category, number>;
  primaryCurrency: string;
}

export interface SystemState {
  key: string;
  value: string;
  updated_at: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  db: {
    connected: boolean;
    totalSubscriptions: number;
  };
  bot: {
    enabled: boolean;
    running: boolean;
    allowedChatIdConfigured: boolean;
  };
  scheduler: {
    running: boolean;
    lastRunAt: string | null;
    intervalMinutes: number;
  };
}
