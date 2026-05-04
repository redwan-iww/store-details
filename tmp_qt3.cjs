const D = require('better-sqlite3');
const d = new D('store.db');
const r = d.prepare("SELECT description, COUNT(*) as count, SUM(amount) as total FROM transactions WHERE source_file='Store_Transactions' AND description IS NOT NULL AND description != '' GROUP BY description ORDER BY count DESC").all();
console.log(JSON.stringify(r, null, 2));
d.close();
