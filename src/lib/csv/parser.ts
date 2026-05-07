import Papa from 'papaparse';
import { readFileSync } from 'fs';
import { upsertTransaction } from '../db';
import { CSV_CONFIG, type CSVSource, type TransactionInput } from '../types';

function generateId(source: CSVSource, row: Record<string, string>): string {
  const config = CSV_CONFIG[source];

  // Extension_Users uses composite key
  if (source === 'Extension_Users') {
    return `${row['Extension User Owner.id'] || ''}|${row['First Install Date'] || ''}`;
  }

  // Others use single idField
  const idFieldMap: Record<string, string> = {
    Books_Invoice: 'Invoice Number',
    Store_Subscriptions: 'Subscription ID',
    Store_Transactions: 'Transaction ID',
    Store_Commissions: 'Commission ID',
  };

  const field = idFieldMap[source];
  return `${source}|${row[field] || ''}`;
}

function extractDate(source: CSVSource, row: Record<string, string>): string {
  const config = CSV_CONFIG[source];
  const dateStr = row[config.dateField] || '';

  // Parse various date formats
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return '';

  return parsed.toISOString().split('T')[0];
}

function extractMonth(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.substring(0, 7);
}

function extractAmount(source: CSVSource, row: Record<string, string>): number {
  const config = CSV_CONFIG[source];
  for (const field of config.amountFields) {
    const val = parseFloat(row[field]?.replace(/[^0-9.-]/g, '') || '0');
    if (!isNaN(val) && val !== 0) return val;
  }
  return 0;
}

function extractCustomer(source: CSVSource, row: Record<string, string>): string {
  const config = CSV_CONFIG[source];
  for (const field of config.customerFields) {
    if (row[field]) return row[field];
  }
  return '';
}

function extractDescription(source: CSVSource, row: Record<string, string>): string {
  return row[CSV_CONFIG[source].descriptionField] || '';
}

function extractCurrency(source: CSVSource, row: Record<string, string>): string {
  const currencyFieldMap: Record<string, string> = {
    Books_Invoice: 'Currency Code',
    Store_Subscriptions: 'Subscription Currency',
    Store_Transactions: 'Currency',
    Store_Commissions: 'Commission Currency',
    Extension_Users: '',
  };
  const field = currencyFieldMap[source];
  if (field && row[field]) return row[field].trim();
  return 'USD';
}

function extractStatus(source: CSVSource, row: Record<string, string>): string {
  return row[CSV_CONFIG[source].statusField] || '';
}

export function parseCSV(source: CSVSource, csvContent: string): { inserted: number; skipped: number } {
  const config = CSV_CONFIG[source];
  const records = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  let inserted = 0;
  let skipped = 0;

  for (const row of records.data) {
    // Skip test data (instawebworks.com.au domain)
    if (source === 'Extension_Users') {
      const email = row['Email'] || '';
      const secondaryEmail = row['Secondary Email'] || '';
      if (email.includes('instawebworks.com.au') || secondaryEmail.includes('instawebworks.com.au')) {
        skipped++;
        continue;
      }
    }

    // Check if this row belongs to a different source based on Business Category
    let effectiveSource = source;
    if (source === 'Store_Subscriptions' && row['Business Category'] === 'zoho') {
      effectiveSource = 'Store_Commissions';
    }

    const effectiveConfig = CSV_CONFIG[effectiveSource];
    const id = generateId(effectiveSource, row);
    const date = extractDate(effectiveSource, row);

    if (!id || !date) {
      skipped++;
      continue;
    }

    const input: TransactionInput = {
      id,
      type: effectiveConfig.type,
      source_file: effectiveSource,
      date,
      month: extractMonth(date),
      customer: extractCustomer(effectiveSource, row),
      description: extractDescription(effectiveSource, row),
      amount: extractAmount(effectiveSource, row),
      currency: extractCurrency(effectiveSource, row),
      status: extractStatus(effectiveSource, row),
      raw_data: row,
    };

    upsertTransaction(input);
    inserted++;
  }

  return { inserted, skipped };
}

export function parseCSVFile(source: CSVSource, filePath: string): { inserted: number; skipped: number } {
  const content = readFileSync(filePath, 'utf-8');
  return parseCSV(source, content);
}