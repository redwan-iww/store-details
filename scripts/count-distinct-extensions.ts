const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'store.db');
const db = new Database(DB_PATH);

// Get distinct extension names (description field contains extension name)
const distinctExtensions = db.prepare(`
  SELECT DISTINCT description as extension_name, COUNT(*) as install_count
  FROM transactions 
  WHERE source_file = 'Extension_Users'
  GROUP BY description
  ORDER BY install_count DESC
`).all();

console.log('=== DISTINCT EXTENSIONS AT STORE ===\n');
console.log(`Total Unique Extensions: ${distinctExtensions.length}\n`);
console.log('-'.repeat(60));
console.log('Extension Name'.padEnd(50) + 'Installs');
console.log('-'.repeat(60));

for (const ext of distinctExtensions) {
  const name = ext.extension_name || '(unnamed)';
  const truncatedName = name.length > 48 ? name.substring(0, 45) + '...' : name;
  console.log(truncatedName.padEnd(50) + String(ext.install_count).padStart(6));
}

console.log('-'.repeat(60));
console.log(`\nTotal: ${distinctExtensions.length} distinct extensions`);

db.close();
