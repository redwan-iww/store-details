import Database from 'better-sqlite3';
import path from 'path';
import type { Transaction, TransactionInput, DataFilters } from '../types';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'store.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('service', 'product')),
      source_file TEXT NOT NULL,
      date TEXT NOT NULL,
      month TEXT NOT NULL,
      customer TEXT,
      description TEXT,
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      status TEXT,
      raw_data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_month ON transactions(month);
    CREATE INDEX IF NOT EXISTS idx_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_customer ON transactions(customer);
    CREATE INDEX IF NOT EXISTS idx_source ON transactions(source_file);
  `);
}

export function upsertTransaction(input: TransactionInput): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO transactions
    (id, type, source_file, date, month, customer, description, amount, currency, status, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    input.id,
    input.type,
    input.source_file,
    input.date,
    input.month,
    input.customer,
    input.description,
    input.amount,
    input.currency,
    input.status,
    JSON.stringify(input.raw_data)
  );
}

export function getTransactions(filters: DataFilters): { records: Transaction[]; summary: { totalAmount: number; count: number } } {
  const database = getDb();

  let sql = `SELECT * FROM transactions WHERE 1=1`;
  const params: (string | undefined)[] = [];

  if (filters.month) {
    sql += ` AND month = ?`;
    params.push(filters.month);
  }

  if (filters.type !== 'all') {
    sql += ` AND type = ?`;
    params.push(filters.type);
  }

  if (filters.customer) {
    sql += ` AND customer = ?`;
    params.push(filters.customer);
  }

  if (filters.status) {
    sql += ` AND status = ?`;
    params.push(filters.status);
  }

  sql += ` ORDER BY date DESC`;

  const rows = database.prepare(sql).all(...params) as Transaction[];
  const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

  return {
    records: rows,
    summary: { totalAmount, count: rows.length },
  };
}

export function getCustomers(type?: 'all' | 'service' | 'product'): string[] {
  const database = getDb();

  if (!type || type === 'all') {
    const rows = database.prepare(`SELECT DISTINCT customer FROM transactions WHERE customer IS NOT NULL AND customer != '' ORDER BY customer`).all() as { customer: string }[];
    return rows.map(r => r.customer);
  }

  const stmt = database.prepare(`SELECT DISTINCT customer FROM transactions WHERE type = ? AND customer IS NOT NULL AND customer != '' ORDER BY customer`);
  const rows = stmt.all(type) as { customer: string }[];
  return rows.map(r => r.customer);
}

export function getStatuses(type?: 'all' | 'service' | 'product'): string[] {
  const database = getDb();

  if (!type || type === 'all') {
    const rows = database.prepare(`SELECT DISTINCT status FROM transactions WHERE status IS NOT NULL AND status != '' ORDER BY status`).all() as { status: string }[];
    return rows.map(r => r.status);
  }

  const stmt = database.prepare(`SELECT DISTINCT status FROM transactions WHERE type = ? AND status IS NOT NULL AND status != '' ORDER BY status`);
  const rows = stmt.all(type) as { status: string }[];
  return rows.map(r => r.status);
}

export function getMonths(): string[] {
  const database = getDb();
  const rows = database.prepare(`SELECT DISTINCT month FROM transactions ORDER BY month DESC`).all() as { month: string }[];
  return rows.map(r => r.month);
}