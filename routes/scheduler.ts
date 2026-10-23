import { Hono } from 'hono';
import { runRenewalCheck } from '../scheduler.js';

export const schedulerRoutes = new Hono();

// POST /api/scheduler/run
schedulerRoutes.post('/run', async (c) => {
  try {
    const result = await runRenewalCheck();
    return c.json({ success: true, ...result });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to run scheduler check' }, 500);
  }
});

