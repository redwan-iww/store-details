const D = require('better-sqlite3');
const d = new D('store.db');
const r = d.prepare("SELECT DISTINCT status FROM transactions WHERE source_file='Store_Transactions' ORDER BY status").all();
console.log(r.map(x => x.status));
d.close();
