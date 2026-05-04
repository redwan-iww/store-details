const Database = require('better-sqlite3');
const db = new Database('store.db');

// Check raw Commission Amount vs Transaction Amount
const sample = db.prepare("SELECT raw_data FROM transactions WHERE source_file='Store_Transactions' AND amount > 0 LIMIT 5").all();
console.log('--- Sample raw values ---');
sample.forEach(r => {
  const d = JSON.parse(r.raw_data);
  console.log('Transaction Amount:', d['Transaction Amount'], '| Commission Amount:', d['Commission Amount'], '| Eligible:', d['Eligible  Transaction Amount']);
});

// Check the CSV header for Store_Transactions
const fs = require('fs');
const Papa = require('papaparse');
const content = fs.readFileSync('store-data/Store_Transactions.csv', 'utf-8');
const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
console.log('\n--- CSV columns containing "Amount" ---');
console.log(Object.keys(parsed.data[0]).filter(k => k.toLowerCase().includes('amount')));

// Sum commission amounts from raw_data
let totalCommission = 0;
let totalTxn = 0;
let count = 0;
const rows = db.prepare("SELECT raw_data FROM transactions WHERE source_file='Store_Transactions'").all();
for (const r of rows) {
  const d = JSON.parse(r.raw_data);
  const comm = parseFloat(d['Commission Amount']) || 0;
  const txn = parseFloat(d['Transaction Amount']) || 0;
  totalCommission += comm;
  totalTxn += txn;
  count++;
}
console.log(`\n--- Aggregates (${count} rows) ---`);
console.log('Sum Transaction Amount:', totalCommission);
console.log('Sum Commission Amount:', totalTxn);

// Compare with Store_Commissions
const commTotal = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE source_file='Store_Commissions'").get();
console.log('\nStore_Commissions total in DB:', commTotal.total);

// Check if Commission Amount from Store_Transactions has non-null values
const nonZero = db.prepare("SELECT COUNT(*) as cnt FROM transactions WHERE source_file='Store_Transactions' AND amount > 0").get();
console.log('Store_Transactions rows with amount > 0 (current):', nonZero.cnt);

db.close();
