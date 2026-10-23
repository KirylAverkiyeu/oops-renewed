import { getDb } from './connection.js';
import { Subscription, SubscriptionCreateInput, SubscriptionUpdateInput } from '../types.js';
import { formatDate, advanceDateByCycle, daysUntil } from '../utils/date.js';

// ─── Row Mapper ───────────────────────────────────────────────────────────────

/**
 * Converts a raw SQLite row (0/1 integers) into the domain Subscription type (booleans).
 * This is the single read boundary between SQLite and the rest of the app.
 */
function toSubscription(row: any): Subscription {
  return { ...row, is_trial: row.is_trial === 1, active: row.active === 1 };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getAllSubscriptions(filters?: {
  active?: boolean;
  category?: string;
  search?: string;
}): Subscription[] {
  const db = getDb();
  let query = 'SELECT * FROM subscriptions WHERE 1=1';
  const params: any[] = [];

  if (filters?.active !== undefined) {
    query += ' AND active = ?';
    params.push(filters.active ? 1 : 0);
  }
  if (filters?.category && filters.category !== 'All') {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters?.search?.trim()) {
    query += ' AND (name LIKE ? OR notes LIKE ?)';
    const term = `%${filters.search.trim()}%`;
    params.push(term, term);
  }

  query += ' ORDER BY active DESC, next_renewal_date ASC, name ASC';
  return (db.prepare(query).all(...params) as any[]).map(toSubscription);
}

export function getSubscriptionById(id: number): Subscription | null {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  return row ? toSubscription(row) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function createSubscription(data: SubscriptionCreateInput): Subscription {
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO subscriptions (
      name, amount, currency, billing_cycle, custom_cycle_days,
      next_renewal_date, remind_days_before, category, is_trial,
      cancel_url, notes, active, last_reminded_for_cycle_date, created_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, datetime('now')
    )
  `).run(
    data.name.trim(),
    data.amount,
    (data.currency || 'PLN').toUpperCase().trim(),
    data.billing_cycle,
    data.custom_cycle_days ?? null,
    data.next_renewal_date,
    data.remind_days_before ?? (data.billing_cycle === 'yearly' ? 5 : 2),
    data.category,
    data.is_trial ? 1 : 0,
    data.cancel_url?.trim() || null,
    data.notes?.trim()      || null,
    data.active !== undefined ? (data.active ? 1 : 0) : 1,
    data.last_reminded_for_cycle_date ?? null,
  );

  return getSubscriptionById(Number(result.lastInsertRowid))!;
}

export function updateSubscription(id: number, data: SubscriptionUpdateInput): Subscription | null {
  const existing = getSubscriptionById(id);
  if (!existing) return null;

  const updated: Subscription = {
    ...existing,
    ...data,
    currency: data.currency ? data.currency.toUpperCase().trim() : existing.currency,
    is_trial: data.is_trial !== undefined ? data.is_trial : existing.is_trial,
    active:   data.active   !== undefined ? data.active   : existing.active,
  };

  getDb().prepare(`
    UPDATE subscriptions SET
      name                       = ?,
      amount                     = ?,
      currency                   = ?,
      billing_cycle              = ?,
      custom_cycle_days          = ?,
      next_renewal_date          = ?,
      remind_days_before         = ?,
      category                   = ?,
      is_trial                   = ?,
      cancel_url                 = ?,
      notes                      = ?,
      active                     = ?,
      last_reminded_for_cycle_date = ?
    WHERE id = ?
  `).run(
    updated.name.trim(),
    updated.amount,
    updated.currency,
    updated.billing_cycle,
    updated.custom_cycle_days ?? null,
    updated.next_renewal_date,
    updated.remind_days_before,
    updated.category,
    updated.is_trial ? 1 : 0,         // write boundary: boolean → integer
    updated.cancel_url?.trim() || null,
    updated.notes?.trim()      || null,
    updated.active   ? 1 : 0,         // write boundary: boolean → integer
    updated.last_reminded_for_cycle_date ?? null,
    id,
  );

  return getSubscriptionById(id);
}

export function deleteSubscription(id: number): boolean {
  const result = getDb().prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
  return result.changes > 0;
}

export function markSubscriptionCancelled(id: number): Subscription | null {
  getDb().prepare('UPDATE subscriptions SET active = 0 WHERE id = ?').run(id);
  return getSubscriptionById(id);
}

export function advanceSubscriptionCycle(id: number): Subscription | null {
  const sub = getSubscriptionById(id);
  if (!sub) return null;

  const nextDate = advanceDateByCycle(sub.next_renewal_date, sub.billing_cycle, sub.custom_cycle_days);

  getDb().prepare(`
    UPDATE subscriptions
    SET next_renewal_date = ?, last_reminded_for_cycle_date = NULL
    WHERE id = ?
  `).run(nextDate, id);

  return getSubscriptionById(id);
}

export function snoozeSubscription(id: number): Subscription | null {
  const sub = getSubscriptionById(id);
  if (!sub) return null;

  // Sets a SNOOZE_<date> marker so the alert engine skips today
  // but re-evaluates tomorrow when the date changes.
  const snoozeKey = `SNOOZE_${formatDate()}`;
  getDb().prepare(`
    UPDATE subscriptions SET last_reminded_for_cycle_date = ? WHERE id = ?
  `).run(snoozeKey, id);

  return getSubscriptionById(id);
}

export function markSubscriptionReminded(id: number, renewalDate: string): void {
  getDb().prepare(`
    UPDATE subscriptions SET last_reminded_for_cycle_date = ? WHERE id = ?
  `).run(renewalDate, id);
}

// ─── Scheduler Queries ────────────────────────────────────────────────────────

/**
 * Returns active non-trial subscriptions whose renewal date is strictly in the past.
 * Used by the scheduler to auto-rollover stale dates.
 */
export function getPastDueNonTrials(todayStr: string = formatDate()): Subscription[] {
  return (getDb().prepare(`
    SELECT * FROM subscriptions
    WHERE active = 1 AND is_trial = 0 AND next_renewal_date < ?
    ORDER BY next_renewal_date ASC
  `).all(todayStr) as any[]).map(toSubscription);
}

/**
 * Returns active subscriptions within their reminder window that haven't been
 * alerted yet this cycle and haven't been snoozed today.
 */
export function getEligibleSubscriptionsForAlert(todayStr: string = formatDate()): Subscription[] {
  const snoozeKey = `SNOOZE_${todayStr}`;

  const candidates = (getDb().prepare(`
    SELECT * FROM subscriptions
    WHERE active = 1
      AND (last_reminded_for_cycle_date IS NULL OR last_reminded_for_cycle_date != next_renewal_date)
      AND (last_reminded_for_cycle_date IS NULL OR last_reminded_for_cycle_date != ?)
    ORDER BY next_renewal_date ASC
  `).all(snoozeKey) as any[]).map(toSubscription);

  return candidates.filter((sub) => {
    const days = daysUntil(sub.next_renewal_date);
    // Trials get one extra day of grace (-1) for overdue alerting
    return days <= sub.remind_days_before && days >= (sub.is_trial ? -1 : 0);
  });
}

