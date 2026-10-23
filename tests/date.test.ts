import { describe, it, expect } from 'vitest';
import {
  formatDate,
  parseDate,
  daysUntil,
  advanceDateByCycle,
  advanceDatePastToday,
  normalizeMonthlyAmount,
  calculateAnnualAmount,
} from '../src/utils/date.js';

describe('Date & Normalization Utilities', () => {
  describe('formatDate & parseDate', () => {
    it('formats date correctly to YYYY-MM-DD', () => {
      const d = new Date(2026, 9, 16); // Oct 16, 2026
      expect(formatDate(d)).toBe('2026-10-16');
    });

    it('pads single-digit month and day', () => {
      const d = new Date(2026, 0, 5); // Jan 5, 2026
      expect(formatDate(d)).toBe('2026-01-05');
    });

    it('parses YYYY-MM-DD into a valid midnight Date', () => {
      const d = parseDate('2026-11-20');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(10); // 0-indexed November
      expect(d.getDate()).toBe(20);
      expect(d.getHours()).toBe(0);
    });
  });

  describe('daysUntil', () => {
    it('returns 0 when target is today', () => {
      const today = new Date(2026, 9, 16);
      expect(daysUntil('2026-10-16', today)).toBe(0);
    });

    it('returns positive days for future date', () => {
      const today = new Date(2026, 9, 16);
      expect(daysUntil('2026-10-19', today)).toBe(3);
      expect(daysUntil('2026-10-31', today)).toBe(15);
    });

    it('returns negative days for past date', () => {
      const today = new Date(2026, 9, 16);
      expect(daysUntil('2026-10-14', today)).toBe(-2);
      expect(daysUntil('2026-09-16', today)).toBe(-30);
    });
  });

  describe('advanceDateByCycle', () => {
    it('advances monthly cycle by 1 month', () => {
      expect(advanceDateByCycle('2026-01-15', 'monthly')).toBe('2026-02-15');
      expect(advanceDateByCycle('2026-12-10', 'monthly')).toBe('2027-01-10');
    });

    it('clamps monthly cycle for months with fewer days', () => {
      // Jan 31 + 1 month in non-leap year -> Feb 28
      expect(advanceDateByCycle('2026-01-31', 'monthly')).toBe('2026-02-28');
      // March 31 + 1 month -> April 30
      expect(advanceDateByCycle('2026-03-31', 'monthly')).toBe('2026-04-30');
    });

    it('advances quarterly cycle by 3 months', () => {
      expect(advanceDateByCycle('2026-01-15', 'quarterly')).toBe('2026-04-15');
      expect(advanceDateByCycle('2026-10-01', 'quarterly')).toBe('2027-01-01');
    });

    it('advances yearly cycle by 1 year', () => {
      expect(advanceDateByCycle('2026-06-15', 'yearly')).toBe('2027-06-15');
    });

    it('advances custom_days cycle by exact number of days', () => {
      expect(advanceDateByCycle('2026-10-01', 'custom_days', 45)).toBe('2026-11-15');
      expect(advanceDateByCycle('2026-10-01', 'custom_days', 10)).toBe('2026-10-11');
    });
  });

  describe('advanceDatePastToday', () => {
    it('does not advance if date is already in future or today', () => {
      expect(advanceDatePastToday('2026-10-25', 'monthly', null, '2026-10-16')).toBe('2026-10-25');
      expect(advanceDatePastToday('2026-10-16', 'monthly', null, '2026-10-16')).toBe('2026-10-16');
    });

    it('repeatedly advances past dates until >= today', () => {
      // Past date was 3 months ago (2026-07-10), today is 2026-10-16
      const rolled = advanceDatePastToday('2026-07-10', 'monthly', null, '2026-10-16');
      expect(rolled).toBe('2026-11-10');
      expect(rolled >= '2026-10-16').toBe(true);
    });

    it('handles yearly rollover for long-neglected past date', () => {
      const rolled = advanceDatePastToday('2024-05-01', 'yearly', null, '2026-10-16');
      expect(rolled).toBe('2027-05-01');
      expect(rolled >= '2026-10-16').toBe(true);
    });
  });

  describe('normalizeMonthlyAmount', () => {
    it('normalizes monthly cycle correctly', () => {
      expect(normalizeMonthlyAmount(50, 'monthly')).toBe(50);
    });

    it('normalizes quarterly cycle (divided by 3)', () => {
      expect(normalizeMonthlyAmount(90, 'quarterly')).toBe(30);
    });

    it('normalizes yearly cycle (divided by 12)', () => {
      expect(normalizeMonthlyAmount(120, 'yearly')).toBe(10);
    });

    it('normalizes custom days interval', () => {
      const monthlyEquiv = normalizeMonthlyAmount(100, 'custom_days', 30);
      expect(Math.abs(monthlyEquiv - 101.458)).toBeLessThan(0.1);
    });

    it('handles 0 or negative amount gracefully', () => {
      expect(normalizeMonthlyAmount(0, 'monthly')).toBe(0);
      expect(normalizeMonthlyAmount(-10, 'monthly')).toBe(0);
    });
  });

  describe('calculateAnnualAmount', () => {
    it('calculates yearly projection accurately', () => {
      expect(calculateAnnualAmount(50, 'monthly')).toBe(600);
      expect(calculateAnnualAmount(300, 'quarterly')).toBe(1200);
      expect(calculateAnnualAmount(1200, 'yearly')).toBe(1200);
    });
  });
});
