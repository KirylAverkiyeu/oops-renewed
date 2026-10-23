import { Bot, InlineKeyboard } from 'grammy';
import { Subscription, BillingCycle, Category } from './types.js';
import { daysUntil, normalizeMonthlyAmount } from './utils/date.js';
import {
  getSubscriptionById,
  advanceSubscriptionCycle,
  snoozeSubscription,
  markSubscriptionCancelled,
  createSubscription,
  getAllSubscriptions,
  getKpiStats,
} from './db/index.js';

let botInstance: Bot | null = null;
let isBotRunning = false;
let botUsername: string | null = null;

export function getBotUsername(): string | null {
  return botUsername;
}

export function getBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN?.trim();
}

export function getAllowedChatId(): string | undefined {
  return process.env.ALLOWED_TELEGRAM_CHAT_ID?.trim();
}

export function isBotActive(): boolean {
  return isBotRunning && !!botInstance;
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function formatDaysLabel(days: number): string {
  if (days < 0) return `🚨 OVERDUE by ${Math.abs(days)} days`;
  if (days === 0) return '⚡ TODAY';
  if (days === 1) return 'tomorrow (1 day)';
  return `in ${days} days`;
}

function renewalUrgencyIcon(days: number, isTrial: boolean): string {
  if (isTrial) return '🚨';
  if (days <= 3) return '🔴';
  if (days <= 7) return '🟡';
  return '🟢';
}

export function buildAlertPayload(sub: Subscription) {
  const days = daysUntil(sub.next_renewal_date);
  const monthlyCost = normalizeMonthlyAmount(sub.amount, sub.billing_cycle, sub.custom_cycle_days);

  const daysLabel = escapeMarkdown(formatDaysLabel(days));
  const isTrial = sub.is_trial;
  const headerIcon = isTrial ? '🚨 FREE TRIAL ENDING' : '⚠️ Oops, Renewed\\! Alert';

  const name = escapeMarkdown(sub.name);
  const amount = escapeMarkdown(`${sub.amount.toFixed(2)} ${sub.currency}`);
  const cycle = escapeMarkdown(sub.billing_cycle);
  const monthly = escapeMarkdown(`~${monthlyCost.toFixed(2)} ${sub.currency}/mo`);
  const date = escapeMarkdown(sub.next_renewal_date);
  const category = escapeMarkdown(sub.category);

  const lines = [
    `*${headerIcon}*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📌 *Item:* *${name}*`,
    `💰 *Amount:* \`${amount}\``,
    `🔄 *Billing Cycle:* ${cycle}`,
    `📅 *Renewal Date:* *${date}* \\(${daysLabel}\\)`,
    `📊 *Monthly Burn:* \`${monthly}\``,
    `🏷️ *Category:* ${category}`,
  ];

  if (sub.notes) {
    lines.push(`📝 *Notes:* _${escapeMarkdown(sub.notes)}_`);
  }
  if (sub.cancel_url) {
    const escapedUrl = sub.cancel_url.replace(/([)\\])/g, '\\$1');
    lines.push(`\n🔗 [Manage / Cancel Subscription](${escapedUrl})`);
  }

  const message = lines.join('\n');

  const keyboard = new InlineKeyboard()
    .text('✅ Roll to Next Cycle', `roll:${sub.id}`)
    .text('⏰ Remind Tomorrow', `snooze:${sub.id}`)
    .row()
    .text('🛑 Mark Cancelled', `cancel:${sub.id}`);

  return { message, keyboard };
}

function registerStartSummaryCommand(bot: Bot, allowedChatId: string | undefined) {
  bot.command(['start', 'summary'], async (ctx) => {
    const stats = getKpiStats();
    const primary = stats.primaryCurrency;

    const burnRates =
      Object.entries(stats.monthlyBurnRate)
        .filter(([, amount]) => amount > 0)
        .map(([curr, amount]) => `\`${amount.toFixed(2)} ${curr}/mo\``)
        .join(', ') || `\`0.00 ${primary}/mo\``;

    const annualProjections =
      Object.entries(stats.annualProjection)
        .filter(([, amount]) => amount > 0)
        .map(([curr, amount]) => `\`${amount.toFixed(2)} ${curr}/yr\``)
        .join(', ') || `\`0.00 ${primary}/yr\``;

    const topUpcoming = getAllSubscriptions({ active: true }).slice(0, 3);

    const lines = [
      `📡 *Oops, Renewed\\! — Financial Pulse*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `🔥 *Monthly Burn Rate:* ${burnRates}`,
      `📈 *Annual Projection:* ${annualProjections}`,
      `📋 *Active Trackers:* ${stats.totalActiveCount} items`,
      ...(stats.activeTrialsCount > 0
        ? [`🚨 *Active Trials:* ${stats.activeTrialsCount} pending`]
        : []),
      `━━━━━━━━━━━━━━━━━━━━━\n`,
    ];

    if (topUpcoming.length === 0) {
      lines.push(`_No active subscriptions tracked yet\\._`);
    } else {
      lines.push(`⏳ *Next 3 Renewals:*`);
      for (const item of topUpcoming) {
        const days = daysUntil(item.next_renewal_date);
        const dayLabel =
          days < 0 ? `🚨 ${Math.abs(days)}d overdue` : days === 0 ? `⚡ TODAY` : `in ${days}d`;
        const cost = escapeMarkdown(`${item.amount.toFixed(2)} ${item.currency}`);
        lines.push(
          `• *${escapeMarkdown(item.name)}*: \`${cost}\` \\(${escapeMarkdown(item.next_renewal_date)}, ${escapeMarkdown(dayLabel)}\\)`
        );
      }
    }

    lines.push(`\n💡 _Use /upcoming for next 30 days, or /add to quickly record a renewal\\._`);

    await ctx.reply(lines.join('\n'), { parse_mode: 'MarkdownV2' });
  });
}

function registerUpcomingCommand(bot: Bot) {
  bot.command('upcoming', async (ctx) => {
    const upcomingNext30 = getAllSubscriptions({ active: true }).filter((sub) => {
      const days = daysUntil(sub.next_renewal_date);
      return days >= 0 && days <= 30;
    });

    if (upcomingNext30.length === 0) {
      await ctx.reply(
        '✨ *Good news\\!* No subscriptions or trials are due in the next 30 days\\.',
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const lines = [
      `🗓️ *Renewals in Next 30 Days* \\(${upcomingNext30.length} items\\):`,
      `━━━━━━━━━━━━━━━━━━━━━`,
    ];

    for (const item of upcomingNext30) {
      const days = daysUntil(item.next_renewal_date);
      const icon = renewalUrgencyIcon(days, item.is_trial);
      const daysStr = days === 0 ? 'TODAY' : days === 1 ? 'tomorrow' : `in ${days} days`;
      const cost = escapeMarkdown(`${item.amount.toFixed(2)} ${item.currency}`);

      lines.push(`${icon} *${escapeMarkdown(item.name)}*`);
      lines.push(
        `   └ \`${cost}\` \\(${escapeMarkdown(item.billing_cycle)}\\) • *${escapeMarkdown(item.next_renewal_date)}* \\(${escapeMarkdown(daysStr)}\\)`
      );
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'MarkdownV2' });
  });
}

const VALID_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'yearly', 'custom_days'];
const VALID_CATEGORIES: Category[] = [
  'Entertainment',
  'Infrastructure',
  'Utilities',
  'Insurance',
  'Trial',
  'Other',
];
const ADD_USAGE_TEXT =
  `ℹ️ *Quick Add Format:*\n` +
  `\`/add <Name> <Amount> <Cycle> <YYYY-MM-DD>\`\n\n` +
  `*Examples:*\n` +
  `• \`/add Mullvad 25 monthly 2026-11-15\`\n` +
  `• \`/add "Domain Bundle" 45 yearly 2027-02-01\`\n` +
  `• \`/add Perplexity 0 monthly 2026-10-25\` \\(Set amount 0 for free trials\\)`;

// Matches: ["Name" | 'Name' | Name] <amount> <cycle> <YYYY-MM-DD> [category?]
const ADD_ARGS_REGEX =
  /^("([^"]+)"| '([^']+)'|(\S+))\s+([\d.]+)\s+(\w+)\s+(\d{4}-\d{2}-\d{2})(?:\s+(\w+))?/;

function registerAddCommand(bot: Bot) {
  bot.command('add', async (ctx) => {
    const argsString = (ctx.message?.text || '').replace(/^\/add\s*/, '').trim();

    if (!argsString) {
      await ctx.reply(ADD_USAGE_TEXT, { parse_mode: 'MarkdownV2' });
      return;
    }

    const match = argsString.match(ADD_ARGS_REGEX);
    if (!match) {
      await ctx.reply(
        `❌ *Invalid format\\.*\n` +
          `Usage: \`/add <Name> <Amount> <Cycle> <YYYY-MM-DD>\`\n` +
          `Cycles: \`monthly\`, \`quarterly\`, \`yearly\`, \`custom_days\``,
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const name = (match[2] || match[3] || match[4]).trim();
    const amount = parseFloat(match[5]);
    const rawCycle = match[6].toLowerCase();
    const renewalDate = match[7];
    const rawCategory = match[8] as Category | undefined;

    if (!VALID_CYCLES.includes(rawCycle as BillingCycle)) {
      await ctx.reply(
        `❌ Invalid billing cycle: \`${escapeMarkdown(rawCycle)}\`\\. Must be: \`monthly\`, \`quarterly\`, \`yearly\`, or \`custom_days\`\\.`,
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const cycle: BillingCycle = rawCycle as BillingCycle;
    const category: Category =
      rawCategory && VALID_CATEGORIES.includes(rawCategory)
        ? rawCategory
        : amount === 0
          ? 'Trial'
          : 'Other';

    try {
      const created = createSubscription({
        name,
        amount,
        currency: process.env.DEFAULT_CURRENCY || 'PLN',
        billing_cycle: cycle,
        custom_cycle_days: null,
        next_renewal_date: renewalDate,
        remind_days_before: cycle === 'yearly' ? 5 : 2,
        category,
        is_trial: amount === 0,
        cancel_url: null,
        notes: 'Added via Telegram Bot',
        active: true,
      });

      const { message, keyboard } = buildAlertPayload(created);
      await ctx.reply(`✅ *Subscription Successfully Created\\!*\n\n${message}`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    } catch (err: any) {
      console.error('[Bot] Failed to create subscription via /add:', err);
      await ctx.reply(
        `❌ Error adding subscription: ${escapeMarkdown(err.message || 'Database error')}`,
        { parse_mode: 'MarkdownV2' }
      );
    }
  });
}

function registerHelpCommand(bot: Bot) {
  bot.command('help', async (ctx) => {
    const text =
      `📡 *Oops, Renewed\\! Bot Commands:*\n\n` +
      `• /summary or /start — Overall burn rate and upcoming renewals\n` +
      `• /upcoming — Renewals in the next 30 days\n` +
      `• /add \`<Name> <Amount> <Cycle> <YYYY-MM-DD>\` — Quick add\n` +
      `• /help — Show this help message\n\n` +
      `Interactive alerts allow 1\\-click cycle rollovers, reminders, and cancellations directly from chat\\!`;
    await ctx.reply(text, { parse_mode: 'MarkdownV2' });
  });
}

function registerCallbackHandlers(bot: Bot) {
  // Roll to Next Cycle
  bot.callbackQuery(/^roll:(\d+)$/, async (ctx) => {
    const subId = parseInt(ctx.match[1], 10);

    if (!getSubscriptionById(subId)) {
      await ctx.answerCallbackQuery({
        text: '⚠️ Subscription not found or deleted.',
        show_alert: true,
      });
      return;
    }

    const updated = advanceSubscriptionCycle(subId);
    if (!updated) {
      await ctx.answerCallbackQuery({ text: '❌ Failed to roll over cycle.' });
      return;
    }

    await ctx.answerCallbackQuery({ text: `✅ Rolled over to ${updated.next_renewal_date}!` });

    const { message, keyboard } = buildAlertPayload(updated);
    try {
      await ctx.editMessageText(`✅ *Cycle Rolled Over*\n\n${message}`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    } catch {}
  });

  bot.callbackQuery(/^snooze:(\d+)$/, async (ctx) => {
    const subId = parseInt(ctx.match[1], 10);
    const sub = getSubscriptionById(subId);

    if (!sub) {
      await ctx.answerCallbackQuery({ text: '⚠️ Subscription not found.', show_alert: true });
      return;
    }

    snoozeSubscription(subId);
    await ctx.answerCallbackQuery({
      text: '⏰ Snoozed! Oops, Renewed! will remind you again tomorrow.',
      show_alert: true,
    });

    try {
      await ctx.editMessageText(
        `⏰ *Reminder Snoozed for 24h*\n\n` +
          `We will check *${escapeMarkdown(sub.name)}* again tomorrow\\.\n` +
          `Current renewal date: \`${escapeMarkdown(sub.next_renewal_date)}\``,
        { parse_mode: 'MarkdownV2' }
      );
    } catch {}
  });

  bot.callbackQuery(/^cancel:(\d+)$/, async (ctx) => {
    const subId = parseInt(ctx.match[1], 10);
    const sub = getSubscriptionById(subId);

    if (!sub) {
      await ctx.answerCallbackQuery({ text: '⚠️ Subscription not found.', show_alert: true });
      return;
    }

    markSubscriptionCancelled(subId);
    await ctx.answerCallbackQuery({ text: '🛑 Marked as cancelled!' });

    try {
      await ctx.editMessageText(
        `🛑 *Subscription Cancelled*\n\n` +
          `*${escapeMarkdown(sub.name)}* has been deactivated and archived in Oops, Renewed\\!\\.\n` +
          `No further alerts will be sent unless re\\-activated in the dashboard\\.`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch {}
  });
}

export async function startBot(): Promise<Bot | null> {
  const token = getBotToken();
  const allowedChatId = getAllowedChatId();

  if (!token) {
    console.log('[Bot] No TELEGRAM_BOT_TOKEN provided. Telegram bot is disabled.');
    return null;
  }

  if (botInstance && isBotRunning) {
    return botInstance;
  }

  console.log('[Bot] Initializing grammY Telegram bot...');
  const bot = new Bot(token);
  botInstance = bot;

  bot.use(async (ctx, next) => {
    const incomingChatId = ctx.chat?.id.toString();
    if (allowedChatId && incomingChatId !== allowedChatId) {
      console.warn(`[Bot] Unauthorized access attempt from Chat ID: ${incomingChatId}`);
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: '⛔ Unauthorized chat.', show_alert: true });
      } else {
        await ctx.reply(
          '⛔ Access Denied. This Oops, Renewed! instance is restricted to a private chat ID.'
        );
      }
      return;
    }
    await next();
  });

  registerStartSummaryCommand(bot, allowedChatId);
  registerUpcomingCommand(bot);
  registerAddCommand(bot);
  registerHelpCommand(bot);
  registerCallbackHandlers(bot);

  try {
    bot
      .start({
        onStart: (botInfo) => {
          isBotRunning = true;
          botUsername = botInfo.username;
          console.log(`[Bot] Long-polling started as @${botInfo.username}`);
        },
      })
      .catch((err) => {
        console.error('[Bot] Long polling error:', err);
        isBotRunning = false;
      });
  } catch (err) {
    console.error('[Bot] Failed to start long polling:', err);
  }

  return bot;
}

export async function stopBot(): Promise<void> {
  if (!botInstance || !isBotRunning) return;
  try {
    console.log('[Bot] Stopping grammY bot long-polling...');
    await botInstance.stop();
    isBotRunning = false;
    console.log('[Bot] Bot stopped successfully.');
  } catch (err) {
    console.error('[Bot] Error stopping bot:', err);
  } finally {
    botInstance = null;
  }
}

async function ensureBotInstance(): Promise<Bot | null> {
  if (!botInstance) await startBot();
  return botInstance;
}

export async function sendRenewalAlert(sub: Subscription): Promise<boolean> {
  const token = getBotToken();
  const chatId = getAllowedChatId();

  if (!token || !chatId) {
    console.log(`[Bot] Skipping alert for "${sub.name}": token or chat ID not configured.`);
    return false;
  }

  const bot = await ensureBotInstance();
  if (!bot) return false;

  try {
    const { message, keyboard } = buildAlertPayload(sub);
    await bot.api.sendMessage(chatId, message, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
    console.log(`[Bot] Alert sent for "${sub.name}" to chat ${chatId}`);
    return true;
  } catch (err: any) {
    logSendError(sub.name, chatId, err);
    return false;
  }
}

export async function sendTestAlert(
  sub: Subscription
): Promise<{ success: boolean; message?: string }> {
  const token = getBotToken();
  const chatId = getAllowedChatId();

  if (!token)
    return {
      success: false,
      message: 'TELEGRAM_BOT_TOKEN environment variable is not configured.',
    };
  if (!chatId)
    return {
      success: false,
      message: 'ALLOWED_TELEGRAM_CHAT_ID environment variable is not configured.',
    };

  const bot = await ensureBotInstance();
  if (!bot) return { success: false, message: 'Bot instance could not be initialized.' };

  try {
    const { message, keyboard } = buildAlertPayload(sub);
    await bot.api.sendMessage(chatId, `🧪 *TEST NOTIFICATION*\n${message}`, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
    return { success: true };
  } catch (err: any) {
    console.error('[Bot] Test alert failed:', err);
    return { success: false, message: friendlyErrorMessage(err, chatId) };
  }
}

function logSendError(subName: string, chatId: string, err: any): void {
  const isChatNotFound =
    err.description?.includes('chat not found') || err.message?.includes('chat not found');
  const isBotBlocked =
    err.description?.includes('bot was blocked') || err.message?.includes('bot was blocked');

  if (isChatNotFound) {
    console.error(
      `[Bot] Alert failed for "${subName}": Chat ${chatId} not found. ` +
        `You must send /start to your bot in Telegram before it can message you.`
    );
  } else if (isBotBlocked) {
    console.error(
      `[Bot] Alert failed for "${subName}": Bot was blocked by user in chat ${chatId}.`
    );
  } else {
    console.error(`[Bot] Alert failed for "${subName}":`, err.message || err);
  }
}

function friendlyErrorMessage(err: any, chatId: string): string {
  const isChatNotFound =
    err.description?.includes('chat not found') || err.message?.includes('chat not found');
  const isBotBlocked =
    err.description?.includes('bot was blocked') || err.message?.includes('bot was blocked');
  const isUnauthorized = err.description?.includes('Unauthorized') || err.message?.includes('401');

  if (isChatNotFound) {
    const botHandle = botUsername ? `@${botUsername}` : 'your bot';
    return `Chat not found (Chat ID: ${chatId})! Telegram bots cannot message you first. Open Telegram, find ${botHandle}, and send /start first.`;
  }
  if (isBotBlocked)
    return `The bot was blocked by chat ${chatId}. Please unblock your bot in Telegram.`;
  if (isUnauthorized)
    return 'Invalid TELEGRAM_BOT_TOKEN. Please verify your token with @BotFather.';
  return err.message || 'Failed to dispatch Telegram message';
}
