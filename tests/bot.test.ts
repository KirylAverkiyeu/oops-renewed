import { describe, it, expect } from 'vitest';
import { escapeMarkdown, buildAlertPayload } from '../src/bot.js';
import { Subscription } from '../src/types.js';

describe('Telegram Bot Formatter & Alert Payload', () => {
  describe('escapeMarkdown', () => {
    it('escapes MarkdownV2 special characters correctly', () => {
      const raw = 'Special [chars] *bold* _italic_ ~strike~ `code` . ! - = |';
      const escaped = escapeMarkdown(raw);

      expect(escaped).not.toContain('[chars]');
      expect(escaped).toContain('\\[chars\\]');
      expect(escaped).toContain('\\*bold\\*');
      expect(escaped).toContain('\\.');
      expect(escaped).toContain('\\!');
      expect(escaped).toContain('\\-');
    });

    it('leaves plain alphanumerics untouched', () => {
      expect(escapeMarkdown('Netflix 4K Premium')).toBe('Netflix 4K Premium');
    });
  });

  describe('buildAlertPayload', () => {
    const baseSub: Subscription = {
      id: 42,
      name: 'GitHub Copilot',
      amount: 10.0,
      currency: 'USD',
      billing_cycle: 'monthly',
      custom_cycle_days: null,
      next_renewal_date: '2026-10-20',
      remind_days_before: 5,
      category: 'Infrastructure',
      is_trial: false,
      cancel_url: 'https://github.com/settings/billing',
      notes: 'AI autocomplete assistant',
      active: true,
      last_reminded_for_cycle_date: null,
      created_at: '2026-10-01 12:00:00',
    };

    it('formats a regular subscription alert with rich details and buttons', () => {
      const { message, keyboard } = buildAlertPayload(baseSub);

      expect(message).toContain('Oops, Renewed\\! Alert');
      expect(message).toContain('GitHub Copilot');
      expect(message).toContain('10\\.00 USD');
      expect(message).toContain('Infrastructure');
      expect(message).toContain('https://github.com/settings/billing');

      // Verify inline keyboard contains all 3 required action buttons
      const flatButtons = keyboard.inline_keyboard.flat();
      const callbackDatas = flatButtons.map((b) => (b as any).callback_data);

      expect(callbackDatas).toContain('roll:42');
      expect(callbackDatas).toContain('snooze:42');
      expect(callbackDatas).toContain('cancel:42');
    });

    it('escapes reserved characters in URLs for MarkdownV2', () => {
      const subWithUrlParens: Subscription = {
        ...baseSub,
        cancel_url: 'https://example.com/cancel(special)',
      };
      const { message } = buildAlertPayload(subWithUrlParens);
      expect(message).toContain('https://example.com/cancel(special\\)');
    });

    it('formats free trials with urgent header', () => {
      const trialSub: Subscription = {
        ...baseSub,
        name: 'Perplexity Pro Trial',
        amount: 0.0,
        is_trial: true,
        category: 'Trial',
      };

      const { message } = buildAlertPayload(trialSub);
      expect(message).toContain('FREE TRIAL ENDING');
      expect(message).toContain('Perplexity Pro Trial');
    });
  });
});
