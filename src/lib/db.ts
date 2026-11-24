import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function dbPath(): string {
  const fromEnv = process.env.FRIEREN_DB?.trim();
  if (fromEnv) return fromEnv;
  const state = process.env.XDG_STATE_HOME?.trim() || join(homedir(), '.local', 'state');
  return join(state, 'frieren', 'frieren.db');
}

export function dbExists(path: string = dbPath()): boolean {
  return existsSync(path);
}

// Open strictly read-only. Never CREATE/INSERT/UPDATE from this project:
// schema migrations belong to frieren-desk (hooks/frieren-log.sh, shell.qml).
function openReadOnly(path: string): DatabaseSync | null {
  if (!existsSync(path)) return null;
  const db = new DatabaseSync(path, { readOnly: true });
  db.exec('PRAGMA query_only = ON;');
  return db;
}

function all<T>(path: string, sql: string, params: Record<string, unknown> = {}): T[] {
  const db = openReadOnly(path);
  if (!db) return [];
  try {
    return db.prepare(sql).all(params) as T[];
  } catch {
    // Missing table on a fresh DB (e.g. only history so far): show empty.
    return [];
  } finally {
    db.close();
  }
}

function get<T>(path: string, sql: string, params: Record<string, unknown> = {}): T | null {
  const rows = all<T>(path, sql, params);
  return rows[0] ?? null;
}

export interface DayRow {
  day: string;
  turns: number;
  ok_turns: number;
  ok_pct: number;
  avg_ms: number;
  tool_failures: number;
}

export interface Totals {
  turns: number;
  ok: number;
  ok_pct: number;
  avg_ms: number;
}

export interface Turn {
  id: number;
  ts: string;
  session: string | null;
  prompt: string | null;
  duration_ms: number | null;
  exit_code: number | null;
  ok: number | null;
  tools_total: number | null;
  tools_failed: number | null;
  error: string | null;
  model: string | null;
}

export interface ToolCall {
  id: number;
  ts: string;
  session: string | null;
  tool: string | null;
  command: string | null;
  status: string | null;
  ok: number | null;
  duration_ms: number | null;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
}

export interface Message {
  id: number;
  conversation_id: string;
  role: string;
  text: string;
  command: string;
  output: string;
  status: string;
  ts: number;
}

export interface Reminder {
  id: number;
  title: string;
  due_at: number | null;
  recurrence: string;
  done: number;
  created_at: number;
}

const DAILY_SQL = `
  SELECT substr(ts, 1, 10) AS day,
         count(*) AS turns,
         sum(ok) AS ok_turns,
         round(100.0 * sum(ok) / count(*), 1) AS ok_pct,
         round(avg(duration_ms)) AS avg_ms,
         sum(tools_failed) AS tool_failures
  FROM turns
  GROUP BY day
  ORDER BY day DESC
  LIMIT :days
`;

export function getDaily(path: string, days: number): DayRow[] {
  return all<DayRow>(path, DAILY_SQL, { days });
}

export function getTotals(path: string): Totals | null {
  return get<Totals>(
    path,
    `SELECT count(*) AS turns, sum(ok) AS ok,
            round(100.0 * sum(ok) / count(*), 1) AS ok_pct,
            round(avg(duration_ms)) AS avg_ms FROM turns`,
  );
}

export function getTopFailing(path: string, limit: number): { command: string; fails: number }[] {
  return all(path, `SELECT command, count(*) AS fails FROM tools WHERE ok = 0 GROUP BY command ORDER BY fails DESC LIMIT :limit`, {
    limit,
  });
}

export function getSlowestTurns(path: string, limit: number): { prompt: string; duration_ms: number }[] {
  return all(
    path,
    `SELECT substr(prompt, 1, 80) AS prompt, duration_ms FROM turns ORDER BY duration_ms DESC LIMIT :limit`,
    { limit },
  );
}

export function getTurns(path: string, limit: number, okFilter: 'all' | 'ok' | 'fail'): Turn[] {
  const where = okFilter === 'ok' ? 'WHERE ok = 1' : okFilter === 'fail' ? 'WHERE ok = 0' : '';
  return all<Turn>(
    path,
    `SELECT id, ts, session, prompt, duration_ms, exit_code, ok, tools_total, tools_failed, error, model
     FROM turns ${where} ORDER BY id DESC LIMIT :limit`,
    { limit },
  );
}

export function getTools(path: string, limit: number, okFilter: 'all' | 'ok' | 'fail'): ToolCall[] {
  const where = okFilter === 'ok' ? 'WHERE ok = 1' : okFilter === 'fail' ? 'WHERE ok = 0' : '';
  return all<ToolCall>(
    path,
    `SELECT id, ts, session, tool, command, status, ok, duration_ms
     FROM tools ${where} ORDER BY id DESC LIMIT :limit`,
    { limit },
  );
}

export function getConversations(path: string, limit: number): Conversation[] {
  return all<Conversation>(
    path,
    `SELECT c.id, c.title, c.created_at, c.updated_at,
            (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
     FROM conversations c ORDER BY c.updated_at DESC LIMIT :limit`,
    { limit },
  );
}

export function getMessages(path: string, conversationId: string, limit: number): Message[] {
  return all<Message>(
    path,
    `SELECT id, conversation_id, role, text, command, output, status, ts
     FROM messages WHERE conversation_id = :id ORDER BY id ASC LIMIT :limit`,
    { id: conversationId, limit },
  );
}

export function searchMessages(path: string, query: string, limit: number): Message[] {
  if (!query.trim()) return [];
  // FTS5 index maintained by frieren-desk; fall back to LIKE when absent.
  const fts = all<Message>(
    path,
    `SELECT m.id, m.conversation_id, m.role, m.text, m.command, m.output, m.status, m.ts
     FROM messages_fts f JOIN messages m ON m.id = f.rowid
     WHERE messages_fts MATCH :q ORDER BY m.id DESC LIMIT :limit`,
    { q: query, limit },
  );
  if (fts.length > 0) return fts;
  return all<Message>(
    path,
    `SELECT id, conversation_id, role, text, command, output, status, ts
     FROM messages WHERE text LIKE :like ORDER BY id DESC LIMIT :limit`,
    { like: `%${query}%`, limit },
  );
}

export function getReminders(path: string, done: 0 | 1, limit: number): Reminder[] {
  return all<Reminder>(path, `SELECT id, title, due_at, recurrence, done, created_at FROM reminders WHERE done = :done ORDER BY due_at IS NULL, due_at ASC LIMIT :limit`, {
    done,
    limit,
  });
}

export function getReminderCounts(path: string): { pending: number; done: number } {
  const rows = all<{ done: number; n: number }>(path, `SELECT done, count(*) AS n FROM reminders GROUP BY done`);
  let pending = 0;
  let doneCount = 0;
  for (const r of rows) {
    if (r.done === 1) doneCount = r.n;
    else pending = r.n;
  }
  return { pending, done: doneCount };
}
