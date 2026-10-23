import {
  getDb,
  getPastDueNonTrials,
  getEligibleSubscriptionsForAlert,
  markSubscriptionReminded,
  setSystemState,
  getSystemState,
} from './db/index.js';
import { formatDate, advanceDatePastToday, daysUntil } from './utils/date.js';
import { sendRenewalAlert } from './bot.js';

const STARTUP_DELAY_MS = 1_500;
const DEFAULT_INTERVAL_MINUTES = 60;

export interface SchedulerRunResult {
  timestamp: string;
  autoRolledCount: number;
  alertsSentCount: number;
  errors: string[];
}

let schedulerInterval: NodeJS.Timeout | null = null;
let isCheckRunning = false;

function autoRolloverPastDue(todayStr: string): number {
  const pastDueSubs = getPastDueNonTrials(todayStr);
  if (pastDueSubs.length === 0) return 0;

  console.log(
    `[Scheduler] Found ${pastDueSubs.length} past-due non-trial subscription(s) to auto-rollover.`
  );

  const db = getDb();
  const updateStmt = db.prepare(`
    UPDATE subscriptions SET
      next_renewal_date = ?,
      last_reminded_for_cycle_date = NULL
    WHERE id = ?
  `);

  let count = 0;
  const rolloverTx = db.transaction((subs) => {
    for (const sub of subs) {
      const newDate = advanceDatePastToday(
        sub.next_renewal_date,
        sub.billing_cycle,
        sub.custom_cycle_days,
        todayStr
      );
      updateStmt.run(newDate, sub.id);
      count++;
      console.log(
        `[Scheduler] 🔄 Auto-rolled "${sub.name}": ${sub.next_renewal_date} -> ${newDate}`
      );
    }
  });

  rolloverTx(pastDueSubs);
  return count;
}

async function dispatchEligibleAlerts(
  todayStr: string
): Promise<{ sentCount: number; errors: string[] }> {
  const eligibleSubs = getEligibleSubscriptionsForAlert(todayStr);
  console.log(
    `[Scheduler] Found ${eligibleSubs.length} subscription(s) eligible for renewal notification.`
  );

  let sentCount = 0;
  const errors: string[] = [];

  for (const sub of eligibleSubs) {
    const days = daysUntil(sub.next_renewal_date);
    console.log(
      `[Scheduler] Alerting for "${sub.name}" (renews in ${days} days on ${sub.next_renewal_date})...`
    );

    try {
      const sent = await sendRenewalAlert(sub);
      if (sent) {
        markSubscriptionReminded(sub.id, sub.next_renewal_date);
        sentCount++;
        console.log(
          `[Scheduler] 🔔 Recorded reminder state for "${sub.name}" on cycle ${sub.next_renewal_date}`
        );
      } else {
        console.warn(
          `[Scheduler] Alert for "${sub.name}" skipped (bot disabled or chat unavailable).`
        );
      }
    } catch (err: any) {
      const errorMsg = `Failed to dispatch alert for "${sub.name}": ${err.message || err}`;
      console.error(`[Scheduler] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  return { sentCount, errors };
}

function recordSchedulerState(
  timestamp: string,
  autoRolledCount: number,
  alertsSentCount: number,
  errorsCount: number
): void {
  setSystemState('last_scheduler_run_at', timestamp);
  setSystemState(
    'last_scheduler_summary',
    JSON.stringify({ timestamp, autoRolledCount, alertsSentCount, errorsCount })
  );
}

export async function runRenewalCheck(): Promise<SchedulerRunResult> {
  if (isCheckRunning) {
    console.log('[Scheduler] Check already in progress, skipping duplicate invocation.');
    return {
      timestamp: new Date().toISOString(),
      autoRolledCount: 0,
      alertsSentCount: 0,
      errors: ['Check already in progress'],
    };
  }

  isCheckRunning = true;
  const todayStr = formatDate();
  const timestamp = new Date().toISOString();

  console.log(`[Scheduler] ----------------------------------------------------`);
  console.log(`[Scheduler] Running renewal engine check at ${timestamp} (Today: ${todayStr})`);

  try {
    const autoRolledCount = autoRolloverPastDue(todayStr);
    const { sentCount: alertsSentCount, errors } = await dispatchEligibleAlerts(todayStr);

    recordSchedulerState(timestamp, autoRolledCount, alertsSentCount, errors.length);

    console.log(
      `[Scheduler] Engine check completed. Rolled: ${autoRolledCount}, Alerts Sent: ${alertsSentCount}`
    );
    console.log(`[Scheduler] ----------------------------------------------------`);

    return { timestamp, autoRolledCount, alertsSentCount, errors };
  } catch (err: any) {
    console.error('[Scheduler] Fatal error during renewal check execution:', err);
    return {
      timestamp,
      autoRolledCount: 0,
      alertsSentCount: 0,
      errors: [err.message || 'Fatal execution error'],
    };
  } finally {
    isCheckRunning = false;
  }
}

export function startScheduler(intervalMinutes: number = DEFAULT_INTERVAL_MINUTES): void {
  if (schedulerInterval) {
    console.log('[Scheduler] Scheduler is already active.');
    return;
  }

  console.log(
    `[Scheduler] Starting offline-resilient scheduler (Interval: ${intervalMinutes}m)...`
  );

  setTimeout(() => {
    runRenewalCheck().catch((err) => {
      console.error('[Scheduler] Initial startup renewal check encountered error:', err);
    });
  }, STARTUP_DELAY_MS);

  const intervalMs = intervalMinutes * 60 * 1000;
  schedulerInterval = setInterval(() => {
    runRenewalCheck().catch((err) => {
      console.error('[Scheduler] Periodic renewal check encountered error:', err);
    });
  }, intervalMs);
}

export function stopScheduler(): void {
  if (!schedulerInterval) return;

  console.log('[Scheduler] Stopping renewal interval timer...');
  clearInterval(schedulerInterval);
  schedulerInterval = null;
  console.log('[Scheduler] Scheduler stopped cleanly.');
}

export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}

export function getLastSchedulerRunTime(): string | null {
  return getSystemState('last_scheduler_run_at');
}
