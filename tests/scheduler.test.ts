import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  initDb,
  closeDb,
  createSubscription,
  getPastDueNonTrials,
  getEligibleSubscriptionsForAlert,
} from '../src/db/index.js';
import { advanceDatePastToday, formatDate } from '../src/utils/date.js';

describe('Scheduler Engine & Offline-Resilient Logic', () => {
  const testDbDir = path.resolve(process.cwd(), 'tests', 'fixtures-sched');
  const testDbPath = path.join(testDbDir, 'test-scheduler.db');
  const todayStr = formatDate();

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

  it('identifies past due non-trial subscriptions strictly before today', () => {
    const pastSub = createSubscription({
      name: 'Expired Hosting Plan',
      amount: 15.0,
      currency: 'EUR',
      billing_cycle: 'monthly',
      custom_cycle_days: null,
      next_renewal_date: '2026-08-01', // strictly past date
      remind_days_before: 3,
      category: 'Infrastructure',
      is_trial: false,
      cancel_url: null,
      notes: null,
      active: true,
    });

    const pastList = getPastDueNonTrials(todayStr);
    expect(pastList.some((s) => s.id === pastSub.id)).toBe(true);
  });

  it('advances past due dates past today without moving future items', () => {
    const rolled = advanceDatePastToday('2026-08-01', 'monthly', null, todayStr);
    expect(rolled >= todayStr).toBe(true);

    const futureDate = '2027-01-01';
    expect(advanceDatePastToday(futureDate, 'monthly', null, todayStr)).toBe(futureDate);
  });

  it('detects subscriptions due for alert based on remind_days_before window', () => {
    // Subscription renewing today
    const dueToday = createSubscription({
      name: 'Due Today Item',
      amount: 20.0,
      currency: 'PLN',
      billing_cycle: 'monthly',
      custom_cycle_days: null,
      next_renewal_date: todayStr,
      remind_days_before: 2,
      category: 'Entertainment',
      is_trial: false,
      cancel_url: null,
      notes: null,
      active: true,
    });

    const eligible = getEligibleSubscriptionsForAlert(todayStr);
    expect(eligible.some((s) => s.id === dueToday.id)).toBe(true);
  });

  it('suppresses duplicate alerts when last_reminded_for_cycle_date matches renewal date', () => {
    const dueToday = createSubscription({
      name: 'Already Reminded Item',
      amount: 30.0,
      currency: 'PLN',
      billing_cycle: 'monthly',
      custom_cycle_days: null,
      next_renewal_date: todayStr,
      remind_days_before: 2,
      category: 'Entertainment',
      is_trial: false,
      cancel_url: null,
      notes: null,
      active: true,
      last_reminded_for_cycle_date: todayStr, // Already reminded!
    });

    const eligible = getEligibleSubscriptionsForAlert(todayStr);
    expect(eligible.some((s) => s.id === dueToday.id)).toBe(false);
  });

  it('suppresses alerts when subscription is snoozed for today', () => {
    const snoozedToday = createSubscription({
      name: 'Snoozed Item',
      amount: 40.0,
      currency: 'PLN',
      billing_cycle: 'monthly',
      custom_cycle_days: null,
      next_renewal_date: todayStr,
      remind_days_before: 2,
      category: 'Entertainment',
      is_trial: false,
      cancel_url: null,
      notes: null,
      active: true,
      last_reminded_for_cycle_date: `SNOOZE_${todayStr}`,
    });

    const eligible = getEligibleSubscriptionsForAlert(todayStr);
    expect(eligible.some((s) => s.id === snoozedToday.id)).toBe(false);
  });
});
