const Database = require('better-sqlite3');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'store.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const CSV_CONFIG = {
  Books_Invoice: {
    type: 'service',
    idField: 'Invoice Number',
    dateField: 'Invoice Date',
    amountFields: ['Total', 'SubTotal'],
    customerFields: ['Customer Name'],
    descriptionField: 'Item Name',
    statusField: 'Invoice Status',
  },
  Extension_Users: {
    type: 'product',
    idFields: ['Extension User Owner.id', 'First Install Date'],
    dateField: 'First Install Date',
    amountFields: [],
    customerFields: ['Company Name', 'Email'],
    descriptionField: 'Extension User Name',
    statusField: 'Status',
  },
  Store_Subscriptions: {
    type: 'product',
    idField: 'Subscription ID',
    dateField: 'Subscription Start Date',
    amountFields: ['Total Revenue', 'Next Recurring Amount'],
    customerFields: ['Customer Company Name'],
    descriptionField: 'Plan Name',
    statusField: 'Status',
  },
  Store_Transactions: {
    type: 'product',
    idField: 'Transaction ID',
    dateField: 'Transaction Date',
    amountFields: ['Transaction Amount'],
    customerFields: ['Customer Company Name'],
    descriptionField: 'Description',
    statusField: 'Transaction Type',
  },
  Store_Commissions: {
    type: 'service',
    idField: 'Commission ID',
    dateField: 'Commission Accounted Date',
    amountFields: ['Commission Amount', 'Payout Commission'],
    customerFields: ['Customer Company Name'],
    descriptionField: 'Service Name',
    statusField: 'Status',
  },
};

function generateId(source, row) {
  const config = CSV_CONFIG[source];
  if (source === 'Extension_Users') {
    return `${row['Extension User Owner.id'] || ''}|${row['First Install Date'] || ''}`;
  }
  const field = config.idField || config.idFields?.[0];
  return `${source}|${row[field] || ''}`;
}

function extractDate(source, row) {
  const dateStr = row[CSV_CONFIG[source].dateField] || '';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

function extractMonth(dateStr) {
  return dateStr ? dateStr.substring(0, 7) : '';
}

function extractAmount(source, row) {
  const fields = CSV_CONFIG[source].amountFields;
  for (const field of fields) {
    const val = parseFloat((row[field] || '0').replace(/[^0-9.-]/g, ''));
    if (!isNaN(val) && val !== 0) return val;
  }
  return 0;
}

function extractCustomer(source, row) {
  const fields = CSV_CONFIG[source].customerFields;
  for (const field of fields) {
    if (row[field]) return row[field];
  }
  return '';
}

function extractDescription(source, row) {
  return row[CSV_CONFIG[source].descriptionField] || '';
}

function extractStatus(source, row) {
  return row[CSV_CONFIG[source].statusField] || '';
}

const SOURCES = ['Books_Invoice', 'Extension_Users', 'Store_Subscriptions', 'Store_Transactions', 'Store_Commissions'];

// Init schema
db.exec(`
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

console.log('Wiping transactions table...');
db.exec('DELETE FROM transactions');

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO transactions
  (id, type, source_file, date, month, customer, description, amount, currency, status, raw_data)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let grandInserted = 0, grandSkipped = 0;

const dataDir = path.join(__dirname, '..', 'store-data');
for (const source of SOURCES) {
  const filePath = path.join(dataDir, `${source}.csv`);
  console.log(`\nLoading ${source}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = Papa.parse(content, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });

  let inserted = 0, skipped = 0;
  for (const row of records.data) {
    // Zoho rows in Store_Subscriptions -> Store_Commissions (service type)
    let effectiveSource = source;
    let effectiveType = CSV_CONFIG[source].type;
    if (source === 'Store_Subscriptions' && row['Business Category'] === 'Zoho') {
      effectiveSource = 'Store_Commissions';
      effectiveType = 'service';
    }

    const id = generateId(effectiveSource, row);
    const date = extractDate(effectiveSource, row);
    if (!id || !date) { skipped++; continue; }

    insertStmt.run(
      id, effectiveType, effectiveSource, date, extractMonth(date),
      extractCustomer(effectiveSource, row), extractDescription(effectiveSource, row),
      extractAmount(effectiveSource, row), 'USD', extractStatus(effectiveSource, row),
      JSON.stringify(row)
    );
    inserted++;
  }
  console.log(`  inserted: ${inserted}, skipped: ${skipped}`);
  grandInserted += inserted;
  grandSkipped += skipped;
}

console.log(`\nTotal: ${grandInserted} inserted, ${grandSkipped} skipped`);

const byType = db.prepare(`
  SELECT type, source_file, SUM(amount) as total, COUNT(*) as cnt
  FROM transactions GROUP BY type, source_file ORDER BY source_file, type
`).all();
console.log('\nVerification:');
for (const r of byType) {
  console.log(`  ${r.source_file} | ${r.type} | $${r.total.toFixed(0)} | ${r.cnt} rows`);
}

db.close();
console.log('\nDone.');