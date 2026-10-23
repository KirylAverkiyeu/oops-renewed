import { Hono } from 'hono';
import {
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  advanceSubscriptionCycle,
} from '../db/index.js';
import { sendTestAlert } from '../bot.js';
import { SubscriptionCreateInput, SubscriptionUpdateInput } from '../types.js';

export const subscriptionRoutes = new Hono();

function parseId(raw: string) {
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function validateCreateBody(body: SubscriptionCreateInput) {
  if (!body.name || body.name.trim() === '') {
    return 'Name is required';
  }
  if (body.amount === undefined || isNaN(Number(body.amount)) || Number(body.amount) < 0) {
    return 'Amount must be a non-negative number';
  }
  if (!body.next_renewal_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.next_renewal_date)) {
    return 'Valid next_renewal_date (YYYY-MM-DD) is required';
  }
  return null;
}

// GET /api/subscriptions
subscriptionRoutes.get('/', (c) => {
  const activeParam = c.req.query('active');
  const categoryParam = c.req.query('category');
  const searchParam = c.req.query('search');

  const filters: { active?: boolean; category?: string; search?: string } = {};

  if (activeParam !== undefined && activeParam !== '') {
    filters.active = activeParam === '1' || activeParam === 'true';
  }
  if (categoryParam && categoryParam !== 'All') {
    filters.category = categoryParam;
  }
  if (searchParam) {
    filters.search = searchParam;
  }

  return c.json(getAllSubscriptions(filters));
});

// GET /api/subscriptions/:id
subscriptionRoutes.get('/:id', (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return c.json({ error: 'Invalid ID' }, 400);

  const sub = getSubscriptionById(id);
  if (!sub) return c.json({ error: 'Subscription not found' }, 404);

  return c.json(sub);
});

// POST /api/subscriptions
subscriptionRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json<SubscriptionCreateInput>();
    const validationError = validateCreateBody(body);
    if (validationError) return c.json({ error: validationError }, 400);

    return c.json(createSubscription(body), 201);
  } catch (err: any) {
    console.error('[API] Failed to create subscription:', err);
    return c.json({ error: err.message || 'Server error creating subscription' }, 500);
  }
});

// PUT /api/subscriptions/:id
subscriptionRoutes.put('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const body = await c.req.json<SubscriptionUpdateInput>();
    const updated = updateSubscription(id, body);
    if (!updated) return c.json({ error: 'Subscription not found' }, 404);

    return c.json(updated);
  } catch (err: any) {
    console.error('[API] Failed to update subscription:', err);
    return c.json({ error: err.message || 'Server error updating subscription' }, 500);
  }
});

// DELETE /api/subscriptions/:id
subscriptionRoutes.delete('/:id', (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return c.json({ error: 'Invalid ID' }, 400);

  const success = deleteSubscription(id);
  if (!success) return c.json({ error: 'Subscription not found' }, 404);

  return c.json({ success: true, message: 'Subscription deleted' });
});

// POST /api/subscriptions/:id/rollover
subscriptionRoutes.post('/:id/rollover', (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return c.json({ error: 'Invalid ID' }, 400);

  const updated = advanceSubscriptionCycle(id);
  if (!updated) return c.json({ error: 'Subscription not found' }, 404);

  return c.json(updated);
});

// POST /api/subscriptions/:id/test-alert
subscriptionRoutes.post('/:id/test-alert', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) return c.json({ error: 'Invalid ID' }, 400);

  const sub = getSubscriptionById(id);
  if (!sub) return c.json({ error: 'Subscription not found' }, 404);

  const result = await sendTestAlert(sub);
  if (!result.success) {
    return c.json({ error: result.message || 'Failed to dispatch Telegram message' }, 500);
  }

  return c.json({ success: true, message: `Test alert sent to Telegram for "${sub.name}"` });
});
