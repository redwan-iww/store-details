import { NextResponse } from 'next/server';
import { getDb } from '@/lib/adapters/sqlite';

export async function GET() {
  const db = getDb();

  // Cancellations from Extension_Users (Uninstall/Uninstalled)
  const extCancelRows = db.prepare(`
    SELECT id, date, raw_data
    FROM transactions
    WHERE source_file = 'Extension_Users'
      AND json_extract(raw_data, '$.Status') IN ('Uninstall', 'Uninstalled')
  `).all() as { id: string; date: string; raw_data: string }[];

  // Cancellations from Store_Transactions (cancel/scheduled_cancel)
  const txnCancelRows = db.prepare(`
    SELECT id, date, raw_data
    FROM transactions
    WHERE source_file = 'Store_Transactions'
      AND status IN ('cancel', 'scheduled_cancel')
  `).all() as { id: string; date: string; raw_data: string }[];

  // Purchases from Extension_Users
  const purchaseRows = db.prepare(`
    SELECT id, date, raw_data
    FROM transactions
    WHERE source_file = 'Extension_Users'
      AND json_extract(raw_data, '$."Purchased?"') = 'true'
  `).all() as { id: string; date: string; raw_data: string }[];

  // Installs from Extension_Users (all rows)
  const installRows = db.prepare(`
    SELECT id, date, raw_data
    FROM transactions
    WHERE source_file = 'Extension_Users'
  `).all() as { id: string; date: string; raw_data: string }[];

  // Payment failures from Store_Transactions
  const failureRows = db.prepare(`
    SELECT id, date, raw_data
    FROM transactions
    WHERE source_file = 'Store_Transactions'
      AND status = 'recurring_failure'
  `).all() as { id: string; date: string; raw_data: string }[];

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

  const getServiceName = (raw: Record<string, unknown>): string => {
    return (raw['Service Name'] as string) || (raw['Platform'] as string) || '(unknown)';
  };

  const getInstallDate = (raw: Record<string, unknown>): string => {
    return (raw['First Install Date'] as string) || '';
  };

  // Combine all cancellations
  const allCancellations = [
    ...extCancelRows.map(r => {
      const raw = JSON.parse(r.raw_data);
      return { date: r.date, service: normalizeExtName(getServiceName(raw)), installDate: getInstallDate(raw), source: 'extension' as const };
    }),
    ...txnCancelRows.map(r => {
      const raw = JSON.parse(r.raw_data);
      return { date: r.date, service: normalizeExtName(getServiceName(raw)), installDate: '', source: 'subscription' as const };
    }),
  ];

  // Monthly breakdown for cancellations
  const cancelByMonth: Record<string, number> = {};
  allCancellations.forEach(c => {
    const m = (c.date || '').substring(0, 7);
    if (m && m.length >= 7) cancelByMonth[m] = (cancelByMonth[m] || 0) + 1;
  });

  // Monthly breakdown for purchases
  const purchaseByMonth: Record<string, number> = {};
  purchaseRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const m = (getInstallDate(raw) || '').substring(0, 7);
    if (m && m.length >= 7) purchaseByMonth[m] = (purchaseByMonth[m] || 0) + 1;
  });

  // Monthly breakdown for installs
  const installByMonth: Record<string, number> = {};
  installRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const m = (getInstallDate(raw) || '').substring(0, 7);
    if (m && m.length >= 7) installByMonth[m] = (installByMonth[m] || 0) + 1;
  });

  // Monthly breakdown for failures
  const failureByMonth: Record<string, number> = {};
  failureRows.forEach(r => {
    const m = (r.date || '').substring(0, 7);
    if (m) failureByMonth[m] = (failureByMonth[m] || 0) + 1;
  });

  // Yearly breakdowns
  const cancelByYear: Record<string, number> = {};
  allCancellations.forEach(c => {
    const y = (c.date || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) cancelByYear[y] = (cancelByYear[y] || 0) + 1;
  });

  const purchaseByYear: Record<string, number> = {};
  purchaseRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const y = (getInstallDate(raw) || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) purchaseByYear[y] = (purchaseByYear[y] || 0) + 1;
  });

  const installByYear: Record<string, number> = {};
  installRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const y = (getInstallDate(raw) || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) installByYear[y] = (installByYear[y] || 0) + 1;
  });

  const failureByYear: Record<string, number> = {};
  Object.entries(failureByMonth).forEach(([month, count]) => {
    const year = month.substring(0, 4);
    failureByYear[year] = (failureByYear[year] || 0) + count;
  });

  // Per extension/service breakdown
  const cancelByExt: Record<string, number> = {};
  allCancellations.forEach(c => {
    cancelByExt[c.service] = (cancelByExt[c.service] || 0) + 1;
  });

  const purchaseByExt: Record<string, number> = {};
  purchaseRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const p = normalizeExtName(getServiceName(raw));
    purchaseByExt[p] = (purchaseByExt[p] || 0) + 1;
  });

  const installByExt: Record<string, number> = {};
  installRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const p = normalizeExtName(getServiceName(raw));
    installByExt[p] = (installByExt[p] || 0) + 1;
  });

  const failureByExt: Record<string, number> = {};
  failureRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const p = normalizeExtName(getServiceName(raw));
    failureByExt[p] = (failureByExt[p] || 0) + 1;
  });

  // Extension-wise monthly breakdown
  const cancelByExtMonth: Record<string, Record<string, number>> = {};
  allCancellations.forEach(c => {
    const m = (c.date || '').substring(0, 7);
    if (m && m.length >= 7) {
      if (!cancelByExtMonth[c.service]) cancelByExtMonth[c.service] = {};
      cancelByExtMonth[c.service][m] = (cancelByExtMonth[c.service][m] || 0) + 1;
    }
  });

  const purchaseByExtMonth: Record<string, Record<string, number>> = {};
  purchaseRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const p = normalizeExtName(getServiceName(raw));
    const m = (getInstallDate(raw) || '').substring(0, 7);
    if (m && m.length >= 7) {
      if (!purchaseByExtMonth[p]) purchaseByExtMonth[p] = {};
      purchaseByExtMonth[p][m] = (purchaseByExtMonth[p][m] || 0) + 1;
    }
  });

  const installByExtMonth: Record<string, Record<string, number>> = {};
  installRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const p = normalizeExtName(getServiceName(raw));
    const m = (getInstallDate(raw) || '').substring(0, 7);
    if (m && m.length >= 7) {
      if (!installByExtMonth[p]) installByExtMonth[p] = {};
      installByExtMonth[p][m] = (installByExtMonth[p][m] || 0) + 1;
    }
  });

  const failureByExtMonth: Record<string, Record<string, number>> = {};
  failureRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const p = normalizeExtName(getServiceName(raw));
    const m = (r.date || '').substring(0, 7);
    if (m && m.length >= 7) {
      if (!failureByExtMonth[p]) failureByExtMonth[p] = {};
      failureByExtMonth[p][m] = (failureByExtMonth[p][m] || 0) + 1;
    }
  });

  // Extension-wise yearly breakdown
  const cancelByExtYear: Record<string, Record<string, number>> = {};
  allCancellations.forEach(c => {
    const y = (c.date || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) {
      if (!cancelByExtYear[c.service]) cancelByExtYear[c.service] = {};
      cancelByExtYear[c.service][y] = (cancelByExtYear[c.service][y] || 0) + 1;
    }
  });

  const purchaseByExtYear: Record<string, Record<string, number>> = {};
  purchaseRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const p = normalizeExtName(getServiceName(raw));
    const y = (getInstallDate(raw) || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) {
      if (!purchaseByExtYear[p]) purchaseByExtYear[p] = {};
      purchaseByExtYear[p][y] = (purchaseByExtYear[p][y] || 0) + 1;
    }
  });

  const installByExtYear: Record<string, Record<string, number>> = {};
  installRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const p = normalizeExtName(getServiceName(raw));
    const y = (getInstallDate(raw) || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) {
      if (!installByExtYear[p]) installByExtYear[p] = {};
      installByExtYear[p][y] = (installByExtYear[p][y] || 0) + 1;
    }
  });

  const failureByExtYear: Record<string, Record<string, number>> = {};
  failureRows.forEach(r => {
    const raw = JSON.parse(r.raw_data);
    const p = normalizeExtName(getServiceName(raw));
    const y = (r.date || '').substring(0, 4);
    if (y && y.length === 4 && !isNaN(parseInt(y))) {
      if (!failureByExtYear[p]) failureByExtYear[p] = {};
      failureByExtYear[p][y] = (failureByExtYear[p][y] || 0) + 1;
    }
  });

  // Count cancels that followed a payment failure (same customer within 30 days)
  const failureCustomers = new Set(
    failureRows.map(r => {
      const raw = JSON.parse(r.raw_data);
      return raw['Customer Company Name'] as string;
    }).filter(Boolean)
  );

  const cancelCustomerDates = txnCancelRows.map(r => {
    const raw = JSON.parse(r.raw_data);
    return { customer: raw['Customer Company Name'] as string, date: r.date };
  }).filter(c => failureCustomers.has(c.customer));

  let cancelsAfterFailure = 0;
  cancelCustomerDates.forEach(({ customer, date }) => {
    const cancelDate = new Date(date);
    const failureRow = failureRows.find(r => {
      const raw = JSON.parse(r.raw_data);
      const failDate = new Date(r.date);
      const diff = (cancelDate.getTime() - failDate.getTime()) / (1000 * 60 * 60 * 24);
      return raw['Customer Company Name'] === customer && diff >= 0 && diff <= 30;
    });
    if (failureRow) cancelsAfterFailure++;
  });

  return NextResponse.json({
    summary: {
      cancellations: allCancellations.length,
      paymentFailures: failureRows.length,
      purchases: purchaseRows.length,
      installs: installRows.length,
      cancelsAfterFailure,
    },
    cancellations: {
      monthly: Object.entries(cancelByMonth).sort((a, b) => a[0].localeCompare(b[0])),
      yearly: Object.entries(cancelByYear).sort((a, b) => a[0].localeCompare(b[0])),
      byExtension: Object.entries(cancelByExt).sort((a, b) => b[1] - a[1]),
      byExtensionMonthly: cancelByExtMonth,
      byExtensionYearly: cancelByExtYear,
      bySource: {
        extension: extCancelRows.length,
        subscription: txnCancelRows.length,
      },
    },
    paymentFailures: {
      monthly: Object.entries(failureByMonth).sort((a, b) => a[0].localeCompare(b[0])),
      yearly: Object.entries(failureByYear).sort((a, b) => a[0].localeCompare(b[0])),
      byExtension: Object.entries(failureByExt).sort((a, b) => b[1] - a[1]),
      byExtensionMonthly: failureByExtMonth,
      byExtensionYearly: failureByExtYear,
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
