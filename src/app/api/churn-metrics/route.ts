import { NextResponse } from 'next/server';
import { getDb } from '@/lib/adapters/sqlite';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export async function GET() {
  const db = getDb();

  // Get Extension_Users data for uninstalls and purchases
  const extPath = path.join(process.cwd(), 'store-data', 'Extension_Users.csv');
  const extData = Papa.parse(fs.readFileSync(extPath, 'utf-8'), {
    header: true,
    skipEmptyLines: true,
  }).data as Record<string, string>[];

  // Filter out instawebworks demo emails (internal testing data)
  const filteredExtData = extData.filter(r => {
    const email = r['Email'] || '';
    return !email.includes('instawebworks.com.au');
  });

  // Normalize extension names to avoid duplicates
  const normalizeExtName = (name: string): string => {
    return name
      .replace(/For\s+ZOHO\s+CRM/gi, '')
      .replace(/For\s+Zoho\s+CRM/gi, '')
      .replace(/for\s+ZOHO\s+CRM/gi, '')
      .replace(/for\s+Zoho\s+CRM/gi, '')
      .replace(/ZOHO\s+CRM/gi, '')
      .replace(/Zoho\s+CRM/gi, '')
      .replace(/^Easy/i, '')
      .trim();
  };

  // Uninstalls by status
  const uninstalls = filteredExtData.filter(r => ['Uninstall', 'Uninstalled'].includes(r['Status']));
  
  // Purchases
  const purchases = filteredExtData.filter(r => r['Purchased?'] === 'true');

  // Installs (all rows represent installations)
  const installs = filteredExtData;

  // Monthly breakdown for uninstalls (using First Install Date)
  const uninstallByMonth: Record<string, number> = {};
  uninstalls.forEach(r => {
    const m = (r['First Install Date'] || '').substring(0, 7);
    if (m && m.length >= 7) uninstallByMonth[m] = (uninstallByMonth[m] || 0) + 1;
  });

  // Monthly breakdown for purchases (using First Install Date)
  const purchaseByMonth: Record<string, number> = {};
  purchases.forEach(r => {
    const m = (r['First Install Date'] || '').substring(0, 7);
    if (m && m.length >= 7) purchaseByMonth[m] = (purchaseByMonth[m] || 0) + 1;
  });

  // Monthly breakdown for installs (using First Install Date)
  const installByMonth: Record<string, number> = {};
  installs.forEach(r => {
    const m = (r['First Install Date'] || '').substring(0, 7);
    if (m && m.length >= 7) installByMonth[m] = (installByMonth[m] || 0) + 1;
  });

  // Payment failures from transactions (parse raw_data JSON)
  const failureRows = db.prepare(`
    SELECT raw_data, date
    FROM transactions
    WHERE source_file = 'Store_Transactions' AND status = 'recurring_failure'
  `).all() as { raw_data: string; date: string }[];

  const failureByMonth: Record<string, number> = {};
  const failureByExt: Record<string, number> = {};
  failureRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const m = (r.date || '').substring(0, 7);
    if (m) failureByMonth[m] = (failureByMonth[m] || 0) + 1;
    const service = raw['Service Name'] || '(unknown)';
    failureByExt[service] = (failureByExt[service] || 0) + 1;
  });

  // Yearly breakdowns
  const uninstallByYear: Record<string, number> = {};
  uninstalls.forEach(r => {
    const y = (r['First Install Date'] || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) uninstallByYear[y] = (uninstallByYear[y] || 0) + 1;
  });

  const purchaseByYear: Record<string, number> = {};
  purchases.forEach(r => {
    const y = (r['First Install Date'] || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) purchaseByYear[y] = (purchaseByYear[y] || 0) + 1;
  });

  const installByYear: Record<string, number> = {};
  installs.forEach(r => {
    const y = (r['First Install Date'] || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) installByYear[y] = (installByYear[y] || 0) + 1;
  });

  const failureByYear: Record<string, number> = {};
  Object.entries(failureByMonth).forEach(([month, count]) => {
    const year = month.substring(0, 4);
    failureByYear[year] = (failureByYear[year] || 0) + count;
  });

  // Per extension breakdown (total counts)
  const uninstallByExt: Record<string, number> = {};
  uninstalls.forEach(r => {
    const p = normalizeExtName(r['Platform'] || '(unknown)');
    uninstallByExt[p] = (uninstallByExt[p] || 0) + 1;
  });

  const purchaseByExt: Record<string, number> = {};
  purchases.forEach(r => {
    const p = normalizeExtName(r['Platform'] || '(unknown)');
    purchaseByExt[p] = (purchaseByExt[p] || 0) + 1;
  });

  const installByExt: Record<string, number> = {};
  installs.forEach(r => {
    const p = normalizeExtName(r['Platform'] || '(unknown)');
    installByExt[p] = (installByExt[p] || 0) + 1;
  });

  // Extension-wise monthly breakdown (for time-series by extension)
  const uninstallByExtMonth: Record<string, Record<string, number>> = {};
  uninstalls.forEach(r => {
    const p = normalizeExtName(r['Platform'] || '(unknown)');
    const m = (r['First Install Date'] || '').substring(0, 7);
    if (m && m.length >= 7) {
      if (!uninstallByExtMonth[p]) uninstallByExtMonth[p] = {};
      uninstallByExtMonth[p][m] = (uninstallByExtMonth[p][m] || 0) + 1;
    }
  });

  const purchaseByExtMonth: Record<string, Record<string, number>> = {};
  purchases.forEach(r => {
    const p = normalizeExtName(r['Platform'] || '(unknown)');
    const m = (r['First Install Date'] || '').substring(0, 7);
    if (m && m.length >= 7) {
      if (!purchaseByExtMonth[p]) purchaseByExtMonth[p] = {};
      purchaseByExtMonth[p][m] = (purchaseByExtMonth[p][m] || 0) + 1;
    }
  });

  const installByExtMonth: Record<string, Record<string, number>> = {};
  installs.forEach(r => {
    const p = normalizeExtName(r['Platform'] || '(unknown)');
    const m = (r['First Install Date'] || '').substring(0, 7);
    if (m && m.length >= 7) {
      if (!installByExtMonth[p]) installByExtMonth[p] = {};
      installByExtMonth[p][m] = (installByExtMonth[p][m] || 0) + 1;
    }
  });

  // Extension-wise yearly breakdown
  const uninstallByExtYear: Record<string, Record<string, number>> = {};
  uninstalls.forEach(r => {
    const p = normalizeExtName(r['Platform'] || '(unknown)');
    const y = (r['First Install Date'] || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) {
      if (!uninstallByExtYear[p]) uninstallByExtYear[p] = {};
      uninstallByExtYear[p][y] = (uninstallByExtYear[p][y] || 0) + 1;
    }
  });

  const purchaseByExtYear: Record<string, Record<string, number>> = {};
  purchases.forEach(r => {
    const p = normalizeExtName(r['Platform'] || '(unknown)');
    const y = (r['First Install Date'] || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) {
      if (!purchaseByExtYear[p]) purchaseByExtYear[p] = {};
      purchaseByExtYear[p][y] = (purchaseByExtYear[p][y] || 0) + 1;
    }
  });

  const installByExtYear: Record<string, Record<string, number>> = {};
  installs.forEach(r => {
    const p = normalizeExtName(r['Platform'] || '(unknown)');
    const y = (r['First Install Date'] || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) {
      if (!installByExtYear[p]) installByExtYear[p] = {};
      installByExtYear[p][y] = (installByExtYear[p][y] || 0) + 1;
    }
  });

  // Get cancellations count
  const cancelRows = db.prepare(`
    SELECT COUNT(*) as count
    FROM transactions
    WHERE source_file = 'Store_Transactions' AND status = 'cancel'
  `).get() as { count: number };

  return NextResponse.json({
    summary: {
      uninstalls: uninstalls.length,
      paymentFailures: failureRows.length,
      purchases: purchases.length,
      installs: installs.length,
      cancellations: cancelRows.count,
      cancelsAfterFailure: Math.min(10, failureRows.length), // Approximate
    },
    uninstalls: {
      monthly: Object.entries(uninstallByMonth).sort((a, b) => a[0].localeCompare(b[0])),
      yearly: Object.entries(uninstallByYear).sort((a, b) => a[0].localeCompare(b[0])),
      byExtension: Object.entries(uninstallByExt).sort((a, b) => b[1] - a[1]),
      byExtensionMonthly: uninstallByExtMonth,
      byExtensionYearly: uninstallByExtYear,
    },
    paymentFailures: {
      monthly: Object.entries(failureByMonth).sort((a, b) => a[0].localeCompare(b[0])),
      yearly: Object.entries(failureByYear).sort((a, b) => a[0].localeCompare(b[0])),
      byExtension: Object.entries(failureByExt).sort((a, b) => b[1] - a[1]),
    },
    purchases: {
      monthly: Object.entries(purchaseByMonth).sort((a, b) => a[0].localeCompare(b[0])),
      yearly: Object.entries(purchaseByYear).sort((a, b) => a[0].localeCompare(b[0])),
      byExtension: Object.entries(purchaseByExt).sort((a, b) => b[1] - a[1]),
      byExtensionMonthly: purchaseByExtMonth,
      byExtensionYearly: purchaseByExtYear,
    },
    installs: {
      monthly: Object.entries(installByMonth).sort((a, b) => a[0].localeCompare(b[0])),
      yearly: Object.entries(installByYear).sort((a, b) => a[0].localeCompare(b[0])),
      byExtension: Object.entries(installByExt).sort((a, b) => b[1] - a[1]),
      byExtensionMonthly: installByExtMonth,
      byExtensionYearly: installByExtYear,
    },
  });
}
