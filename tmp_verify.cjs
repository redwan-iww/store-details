const Database = require('better-sqlite3');
const db = new Database('store.db');

console.log('=== OVERALL ===');
console.log(db.prepare('SELECT COUNT(*) as total, ROUND(SUM(amount),2) as total_rev, ROUND(AVG(CASE WHEN amount>0 THEN amount END),2) as avg_positive FROM transactions').get());

console.log('\n=== BY SOURCE ===');
console.table(db.prepare(`SELECT source_file, COUNT(*) as records, ROUND(SUM(amount),2) as total, ROUND(AVG(amount),2) as avg FROM transactions GROUP BY source_file ORDER BY source_file`).all());

console.log('\n=== BY TYPE ===');
console.table(db.prepare(`SELECT type, COUNT(*) as records, ROUND(SUM(amount),2) as total FROM transactions GROUP BY type`).all());

console.log('\n=== STORE_SUBSCRIPTIONS - verify amounts now populated ===');
const ss = db.prepare(`SELECT COUNT(*) as total, ROUND(SUM(amount),2) as sum, ROUND(AVG(amount),2) as avg, MIN(amount) as min, MAX(amount) as max FROM transactions WHERE source_file='Store_Subscriptions'`).get();
console.log(ss);

console.log('\n=== STORE_TRANSACTIONS - verify Commission Amount ===');
const st = db.prepare(`SELECT COUNT(*) as total, ROUND(SUM(amount),2) as sum, ROUND(AVG(amount),2) as avg FROM transactions WHERE source_file='Store_Transactions'`).get();
console.log(st);
const stPos = db.prepare(`SELECT COUNT(*) as cnt, ROUND(SUM(amount),2) as sum FROM transactions WHERE source_file='Store_Transactions' AND amount > 0`).get();
console.log('Positive amounts:', stPos);

console.log('\n=== VERIFY zoho rows skipped from Store_Subscriptions ===');
const zohoSample = db.prepare("SELECT raw_data FROM transactions WHERE source_file='Store_Subscriptions' LIMIT 1").all();
if (zohoSample.length > 0) {
  const d = JSON.parse(zohoSample[0].raw_data);
  console.log('Sample biz cat:', d['Business Category']);
  console.log('No zoho rows should remain in Store_Subscriptions');
}
const zohoCheck = db.prepare("SELECT COUNT(*) as cnt FROM transactions WHERE source_file='Store_Subscriptions'").get();
console.log('Store_Subscriptions count:', zohoCheck.cnt, '(was 576, now should be 411)');

console.log('\n=== TOP CUSTOMERS ===');
console.table(db.prepare(`SELECT customer, source_file, COUNT(*) as records, ROUND(SUM(amount),2) as total FROM transactions WHERE customer IS NOT NULL AND customer != '' GROUP BY customer ORDER BY total DESC LIMIT 10`).all());

db.close();
