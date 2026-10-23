import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  initDb,
  closeDb,
  getDb,
  createSubscription,
  getSubscriptionById,
  getAllSubscriptions,
  updateSubscription,
  deleteSubscription,
  advanceSubscriptionCycle,
  snoozeSubscription,
  markSubscriptionCancelled,
  getKpiStats,
  setSystemState,
  getSystemState,
} from '../src/db/index.js';

describe('SQLite Database Layer & Operations', () => {
  const testDbDir = path.resolve(process.cwd(), 'tests', 'fixtures');
  const testDbPath = path.join(testDbDir, 'test-radar.db');

  beforeAll(() => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });
    process.env.DB_PATH = testDbPath;
    initDb(testDbPath);
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
  });

  it('initializes SQLite with WAL mode and creates required tables', () => {
    const db = getDb();
    const pragmaRow = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(pragmaRow.journal_mode.toLowerCase()).toBe('wal');

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('subscriptions');
    expect(tableNames).toContain('system_state');
  });

  it('seeds default starter subscriptions when database is brand new', () => {
    const subs = getAllSubscriptions();
    expect(subs.length).toBeGreaterThanOrEqual(5);
    const netflix = subs.find((s) => s.name.includes('Netflix'));
    expect(netflix).toBeDefined();
    expect(netflix?.currency).toBe('PLN');
  });

  it('creates a new subscription and retrieves it by id', () => {
    const created = createSubscription({
      name: 'Proton Mail',
      amount: 4.99,
      currency: 'EUR',
      billing_cycle: 'monthly',
      custom_cycle_days: null,
      next_renewal_date: '2026-11-20',
      remind_days_before: 2,
      category: 'Utilities',
      is_trial: false,
      cancel_url: 'https://mail.proton.me/settings',
      notes: 'Encrypted email provider',
      active: true,
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.name).toBe('Proton Mail');
    expect(created.amount).toBe(4.99);
    expect(created.currency).toBe('EUR');

    const fetched = getSubscriptionById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Proton Mail');
  });

  it('filters subscriptions by search query and category', () => {
    const protonResults = getAllSubscriptions({ search: 'Proton' });
    expect(protonResults).toHaveLength(1);
    expect(protonResults[0].name).toBe('Proton Mail');

    const utilResults = getAllSubscriptions({ category: 'Utilities' });
    expect(utilResults.some((s) => s.name === 'Proton Mail')).toBe(true);

    const emptyResults = getAllSubscriptions({ search: 'NonExistentProduct123' });
    expect(emptyResults).toHaveLength(0);
  });

  it('updates an existing subscription', () => {
    const subs = getAllSubscriptions({ search: 'Proton Mail' });
    const id = subs[0].id;

    const updated = updateSubscription(id, {
      amount: 5.99,
      notes: 'Updated price after plan renewal',
    });

    expect(updated).not.toBeNull();
    expect(updated?.amount).toBe(5.99);
    expect(updated?.notes).toBe('Updated price after plan renewal');
  });

  it('advances cycle correctly on advanceSubscriptionCycle', () => {
    const subs = getAllSubscriptions({ search: 'Proton Mail' });
    const id = subs[0].id;

    const advanced = advanceSubscriptionCycle(id);
    expect(advanced).not.toBeNull();
    expect(advanced?.next_renewal_date).toBe('2026-12-20');
    expect(advanced?.last_reminded_for_cycle_date).toBeNull();
  });

  it('snoozes a subscription for the current day', () => {
    const subs = getAllSubscriptions({ search: 'Proton Mail' });
    const id = subs[0].id;

    const snoozed = snoozeSubscription(id);
    expect(snoozed).not.toBeNull();
    expect(snoozed?.last_reminded_for_cycle_date?.startsWith('SNOOZE_')).toBe(true);
  });

  it('marks subscription as cancelled (active = false)', () => {
    const subs = getAllSubscriptions({ search: 'Proton Mail' });
    const id = subs[0].id;

    const cancelled = markSubscriptionCancelled(id);
    expect(cancelled).not.toBeNull();
    expect(cancelled?.active).toBe(false);

    const activeOnly = getAllSubscriptions({ active: true });
    expect(activeOnly.some((s) => s.id === id)).toBe(false);
  });

  it('deletes a subscription', () => {
    const subs = getAllSubscriptions({ search: 'Proton Mail' });
    const id = subs[0].id;

    const success = deleteSubscription(id);
    expect(success).toBe(true);

    const deleted = getSubscriptionById(id);
    expect(deleted).toBeNull();
  });

  it('calculates KPI statistics accurately', () => {
    const stats = getKpiStats('PLN');
    expect(stats.totalActiveCount).toBeGreaterThan(0);
    expect(typeof stats.monthlyBurnRate['PLN']).toBe('number');
    expect(typeof stats.annualProjection['PLN']).toBe('number');
    expect(stats.activeTrialsCount).toBeGreaterThanOrEqual(1);
    expect(stats.primaryCurrency).toBe('PLN');
  });

  it('reads and writes system_state key-values correctly', () => {
    setSystemState('test_key', 'hello_world');
    expect(getSystemState('test_key')).toBe('hello_world');

    setSystemState('test_key', 'updated_value');
    expect(getSystemState('test_key')).toBe('updated_value');

    expect(getSystemState('non_existent_key')).toBeNull();
  });
});
