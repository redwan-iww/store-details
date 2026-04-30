import { parseCSVFile } from '../lib/csv/parser';
import { getMonths } from '../lib/db';
import { CSV_CONFIG, type CSVSource } from '../lib/types';
import path from 'path';
import fs from 'fs';

const STORE_DATA_DIR = path.join(process.cwd(), 'store-data');

async function seed() {
  console.log('Starting seed...\n');

  const sources = Object.keys(CSV_CONFIG) as CSVSource[];
  const results: Record<string, { inserted: number; skipped: number }> = {};

  for (const source of sources) {
    const filePath = path.join(STORE_DATA_DIR, `${source}.csv`);

    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${source}.csv not found`);
      continue;
    }

    console.log(`Processing ${source}.csv...`);
    const result = parseCSVFile(source, filePath);
    results[source] = result;
    console.log(`  Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
  }

  console.log('\n--- Seed Summary ---');
  let totalInserted = 0;
  let totalSkipped = 0;
  for (const [source, result] of Object.entries(results)) {
    console.log(`${source}: inserted=${result.inserted}, skipped=${result.skipped}`);
    totalInserted += result.inserted;
    totalSkipped += result.skipped;
  }
  console.log(`\nTotal: inserted=${totalInserted}, skipped=${totalSkipped}`);

  const months = getMonths();
  console.log(`\nDate range: ${months[months.length - 1]} → ${months[0]}`);
  console.log(`Total months: ${months.length}`);
}

seed().catch(console.error);