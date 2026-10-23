import Database, { Database as DatabaseInstance } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations, seedInitialDataIfEmpty } from './schema.js';

let dbInstance: DatabaseInstance | null = null;

export function getDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;

  const isDocker = process.env.NODE_ENV === 'production' && fs.existsSync('/app');
  const defaultDir = isDocker ? '/app/data' : path.resolve(process.cwd(), 'data');
  return path.join(defaultDir, 'radar.db');
}


export function getDb(): DatabaseInstance {
  if (!dbInstance) return initDb();
  return dbInstance;
}

export function initDb(customPath?: string): DatabaseInstance {
  if (dbInstance) return dbInstance;

  const dbPath = customPath || getDbPath();
  const dbDir  = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[DB] Opening SQLite database at: ${dbPath}`);
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  seedInitialDataIfEmpty(db);

  dbInstance = db;
  return db;
}


export function closeDb(): void {
  if (!dbInstance) return;
  try {
    console.log('[DB] Running WAL checkpoint and closing database...');
    dbInstance.pragma('wal_checkpoint(TRUNCATE)');
    dbInstance.close();
    console.log('[DB] Database closed cleanly.');
  } catch (err) {
    console.error('[DB] Error closing database:', err);
  } finally {
    dbInstance = null;
  }
}

