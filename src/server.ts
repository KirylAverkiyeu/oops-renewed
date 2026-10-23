import dotenv from 'dotenv';
dotenv.config();

import { Hono } from 'hono';
import { serve } from '@hono/node-server';

import { initDb, closeDb } from './db/index.js';
import { startBot, stopBot, getBotToken } from './bot.js';
import { startScheduler, stopScheduler } from './scheduler.js';
import { systemRoutes } from './routes/system.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { schedulerRoutes } from './routes/scheduler.js';
import { mountClientApp } from './middleware/staticClient.js';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

initDb();
startBot().catch((err) => console.error('[Server] Bot startup warning:', err));
startScheduler(60);

// ─── App & Routes ─────────────────────────────────────────────────────────────

const app = new Hono();

app.route('/api', systemRoutes);
app.route('/api/subscriptions', subscriptionRoutes);
app.route('/api/scheduler', schedulerRoutes);

mountClientApp(app);

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT || '3000', 10);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`📡 Oops, Renewed! active at http://localhost:${info.port}`);
  console.log(`   └ SQLite WAL Mode:  enabled`);
  console.log(`   └ Telegram Bot:     ${getBotToken() ? 'Configured' : 'Disabled (no token)'}`);
  console.log(`   └ Scheduler:        60m interval active`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Server] ${signal} received — shutting down gracefully...`);

  stopScheduler();
  await stopBot();

  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    closeDb();
    console.log('[Server] Shutdown complete.');
    process.exit(0);
  });

  setTimeout(() => {
    console.warn('[Server] Shutdown timed out — forcing exit.');
    closeDb();
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
