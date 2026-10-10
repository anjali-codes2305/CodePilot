/**
 * Persistent SQLite Storage for CodePilot Collaborative Rooms
 * Uses Node.js built-in `node:sqlite` (DatabaseSync) for zero-dependency, crash-resilient persistence.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export function getDatabase(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || (
    process.env.NODE_ENV === 'test'
      ? ':memory:'
      : path.join(__dirname, '../../../data/codepilot.db')
  );

  if (dbPath !== ':memory:') {
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // WAL mode for fast concurrent read/write (ignored in memory)
  if (dbPath !== ':memory:') {
    try {
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA synchronous = NORMAL;');
    } catch {
      // Pragmas may be restricted in some environments
    }
  }

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'javascript',
      mode TEXT NOT NULL DEFAULT 'mentor',
      host_id TEXT NOT NULL,
      host_name TEXT NOT NULL,
      is_private INTEGER NOT NULL DEFAULT 0,
      passcode TEXT,
      code_version INTEGER NOT NULL DEFAULT 1,
      latest_analysis TEXT,
      settings TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS room_members (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor', -- 'host' | 'editor' | 'viewer'
      avatar_color TEXT NOT NULL DEFAULT '#06b6d4',
      joined_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL,
      is_online INTEGER NOT NULL DEFAULT 1,
      UNIQUE(room_id, client_id)
    );

    CREATE TABLE IF NOT EXISTS room_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL DEFAULT 'editor',
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'chat', -- 'chat' | 'system' | 'ai'
      metadata TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS room_code_history (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      code TEXT NOT NULL,
      editor_id TEXT NOT NULL,
      editor_name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_members_room ON room_members(room_id);
    CREATE INDEX IF NOT EXISTS idx_messages_room ON room_messages(room_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_history_room ON room_code_history(room_id, version);
  `);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.error('Error closing database:', e);
    }
    dbInstance = null;
  }
}

export default { getDatabase, closeDatabase };
