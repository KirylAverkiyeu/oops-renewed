import { Hono } from 'hono';
import { getDb, getKpiStats } from '../db/index.js';
import { getBotToken, isBotActive, getAllowedChatId } from '../bot.js';
import { isSchedulerRunning, getLastSchedulerRunTime } from '../scheduler.js';
import { HealthCheckResponse } from '../types.js';

export const systemRoutes = new Hono();

const serverStartTime = Date.now();

// GET /api/health
systemRoutes.get('/health', (c) => {
  const db = getDb();
  let totalSubscriptions = 0;
  let dbConnected = false;

  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get() as { count: number };
    totalSubscriptions = row?.count ?? 0;
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  const response: HealthCheckResponse = {
    status: dbConnected ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    db: {
      connected: dbConnected,
      totalSubscriptions,
    },
    bot: {
      enabled: !!getBotToken(),
      running: isBotActive(),
      allowedChatIdConfigured: !!getAllowedChatId(),
    },
    scheduler: {
      running: isSchedulerRunning(),
      lastRunAt: getLastSchedulerRunTime(),
      intervalMinutes: 60,
    },
  };

  return c.json(response);
});

// GET /api/stats
systemRoutes.get('/stats', (c) => {
  const defaultCurrency = process.env.DEFAULT_CURRENCY || 'PLN';
  return c.json(getKpiStats(defaultCurrency));
});

