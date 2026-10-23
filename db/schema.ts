import { Database as DatabaseInstance } from 'better-sqlite3';
import { formatDate } from '../utils/date.js';
import { SubscriptionCreateInput } from '../types.js';

// ─── Schema ───────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS subscriptions (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    name                      TEXT    NOT NULL,
    amount                    REAL    NOT NULL,
    currency                  TEXT    NOT NULL DEFAULT 'PLN',
    billing_cycle             TEXT    NOT NULL CHECK(billing_cycle IN ('monthly', 'quarterly', 'yearly', 'custom_days')),
    custom_cycle_days         INTEGER,
    next_renewal_date         TEXT    NOT NULL,
    remind_days_before        INTEGER NOT NULL DEFAULT 5,
    category                  TEXT    NOT NULL CHECK(category IN ('Entertainment', 'Infrastructure', 'Utilities', 'Insurance', 'Trial', 'Other')),
    is_trial                  INTEGER NOT NULL DEFAULT 0 CHECK(is_trial IN (0, 1)),
    cancel_url                TEXT,
    notes                     TEXT,
    active                    INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    last_reminded_for_cycle_date TEXT,
    created_at                TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS system_state (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_subscriptions_active_date
    ON subscriptions(active, next_renewal_date);

  CREATE INDEX IF NOT EXISTS idx_subscriptions_category
    ON subscriptions(category);
`;

export function runMigrations(db: DatabaseInstance): void {
  db.exec(SCHEMA_SQL);
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

const STARTER_SUBSCRIPTIONS: SubscriptionCreateInput[] = [
  {
    name: 'Netflix 4K Premium',
    amount: 60.00,
    currency: 'PLN',
    billing_cycle: 'monthly',
    custom_cycle_days: null,
    next_renewal_date: formatDate(daysFromNow(3)),
    remind_days_before: 2,
    category: 'Entertainment',
    is_trial: false,
    cancel_url: 'https://www.netflix.com/youraccount',
    notes: 'Family plan shared with siblings',
    active: true,
  },
  {
    name: 'Perplexity AI Pro Trial',
    amount: 0.00,
    currency: 'USD',
    billing_cycle: 'monthly',
    custom_cycle_days: null,
    next_renewal_date: formatDate(daysFromNow(6)),
    remind_days_before: 3,
    category: 'Trial',
    is_trial: true,
    cancel_url: 'https://www.perplexity.ai/settings/account',
    notes: 'Cancel before full $20/mo charge hits!',
    active: true,
  },
  {
    name: 'Hetzner Cloud VPS (CX22)',
    amount: 8.50,
    currency: 'EUR',
    billing_cycle: 'monthly',
    custom_cycle_days: null,
    next_renewal_date: formatDate(daysFromNow(15)),
    remind_days_before: 3,
    category: 'Infrastructure',
    is_trial: false,
    cancel_url: 'https://console.hetzner.cloud',
    notes: 'Docker container host & reverse proxy',
    active: true,
  },
  {
    name: 'Cloudflare Domains (.dev + .io)',
    amount: 45.00,
    currency: 'USD',
    billing_cycle: 'yearly',
    custom_cycle_days: null,
    next_renewal_date: formatDate(daysFromNow(45)),
    remind_days_before: 7,
    category: 'Infrastructure',
    is_trial: false,
    cancel_url: 'https://dash.cloudflare.com',
    notes: 'Auto-renews domain bundle annually',
    active: true,
  },
  {
    name: 'Car Insurance (OC + AC)',
    amount: 1450.00,
    currency: 'PLN',
    billing_cycle: 'yearly',
    custom_cycle_days: null,
    next_renewal_date: '2026-11-28',
    remind_days_before: 14,
    category: 'Insurance',
    is_trial: false,
    cancel_url: null,
    notes: 'PZU policy reminder',
    active: true,
  },
];

export function seedInitialDataIfEmpty(db: DatabaseInstance): void {
  const { count } = db
    .prepare('SELECT COUNT(*) as count FROM subscriptions')
    .get() as { count: number };

  if (count > 0) {
    return;
  }
  console.log('[DB] Empty database detected — seeding starter subscriptions...');

  const insert = db.prepare(`
    INSERT INTO subscriptions (
      name, amount, currency, billing_cycle, custom_cycle_days,
      next_renewal_date, remind_days_before, category, is_trial,
      cancel_url, notes, active, last_reminded_for_cycle_date, created_at
    ) VALUES (
      @name, @amount, @currency, @billing_cycle, @custom_cycle_days,
      @next_renewal_date, @remind_days_before, @category, @is_trial,
      @cancel_url, @notes, @active, NULL, datetime('now')
    )
  `);

  const toRow = (item: SubscriptionCreateInput) => ({
    ...item,
    is_trial: item.is_trial ? 1 : 0,
    active:   item.active   ? 1 : 0,
  });

  db.transaction((items: SubscriptionCreateInput[]) => {
    for (const item of items) insert.run(toRow(item));
  })(STARTER_SUBSCRIPTIONS);

  console.log(`[DB] Seeded ${STARTER_SUBSCRIPTIONS.length} starter subscriptions.`);
}

