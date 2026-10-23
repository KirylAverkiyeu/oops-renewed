import { getDb } from './connection.js';

export function getSystemState(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM system_state WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSystemState(key: string, value: string): void {
  getDb().prepare(`
    INSERT INTO system_state (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value      = excluded.value,
      updated_at = datetime('now')
  `).run(key, value);
}

