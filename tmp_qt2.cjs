const D = require('better-sqlite3');
const d = new D('store.db');
const r = d.prepare("SELECT status, COUNT(*) as count, SUM(amount) as total FROM transactions WHERE source_file='Store_Transactions' GROUP BY status ORDER BY count DESC").all();
console.log(r);
d.close();
