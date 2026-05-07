import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/adapters/sqlite';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

type ForecastMethod = 'trend' | 'moving_avg' | 'growth_rate';
type ForecastScope = 'all' | '12m';

interface MonthlyRow {
  month: string;
  type: string;
  total: number;
  count: number;
  service?: number;
  product?: number;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function computeForecast(
  historical: { month: string; service: number; product: number }[],
  method: ForecastMethod,
  scope: ForecastScope
): { month: string; service: number; product: number }[] {
  const withData = historical.filter((r) => r.service > 0 || r.product > 0);
  if (withData.length < 12) return [];

  const serviceVals = withData.map((r) => r.service);
  const productVals = withData.map((r) => r.product);

  // Use last 12 months if scope is '12m', otherwise use all data
  const svcData = scope === '12m' ? serviceVals.slice(-12) : serviceVals;
  const pdtData = scope === '12m' ? productVals.slice(-12) : productVals;

  const forecast: { month: string; service: number; product: number }[] = [];
  const baseDate = new Date(
    parseInt(withData[withData.length - 1].month.split('-')[0]),
    parseInt(withData[withData.length - 1].month.split('-')[1]) - 1
  );

  if (method === 'growth_rate') {
    // YoY Baseline: last 12 months + annual growth applied
    const last12Service = serviceVals.slice(-12);
    const last12Product = productVals.slice(-12);
    const yearAgoService = serviceVals[serviceVals.length - 13] || serviceVals[0];
    const yearAgoProduct = productVals[productVals.length - 13] || productVals[0];

    let growthRateSvc: number, growthRatePdt: number;

    if (scope === '12m') {
      // Single-point YoY from most recent comparable period
      growthRateSvc = yearAgoService > 0 ? serviceVals[serviceVals.length - 1] / yearAgoService : 1;
      growthRatePdt = yearAgoProduct > 0 ? productVals[productVals.length - 1] / yearAgoProduct : 1;
    } else {
      // Average YoY growth from all data
      const sGrowths: number[] = [];
      const pGrowths: number[] = [];
      for (let j = 12; j < serviceVals.length; j++) {
        if (serviceVals[j - 12] > 0) sGrowths.push(serviceVals[j] / serviceVals[j - 12]);
        if (productVals[j - 12] > 0) pGrowths.push(productVals[j] / productVals[j - 12]);
      }
      growthRateSvc = sGrowths.length > 0 ? sGrowths.reduce((a, b) => a + b, 0) / sGrowths.length : 1;
      growthRatePdt = pGrowths.length > 0 ? pGrowths.reduce((a, b) => a + b, 0) / pGrowths.length : 1;
    }

    const maxGrowth = Math.min(growthRateSvc, growthRatePdt, 2.0);
    const minGrowth = Math.max(maxGrowth * 0.5, 0.5);
    const gRate = Math.min(Math.max((maxGrowth + minGrowth) / 2, 0.5), 2.0);

    for (let i = 1; i <= 12; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      forecast.push({
        month: monthStr,
        service: last12Service[last12Service.length - 1] * Math.pow(gRate, i / 12),
        product: last12Product[last12Product.length - 1] * Math.pow(gRate, i / 12),
      });
    }
  } else if (method === 'moving_avg') {
    if (scope === '12m') {
      // Rolling 12-month SMA
      let tempService = [...svcData];
      let tempProduct = [...pdtData];
      for (let i = 1; i <= 12; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const sAvg = tempService.slice(-12).reduce((a, b) => a + b, 0) / 12;
        const pAvg = tempProduct.slice(-12).reduce((a, b) => a + b, 0) / 12;
        forecast.push({ month: monthStr, service: sAvg, product: pAvg });
        tempService.push(sAvg);
        tempProduct.push(pAvg);
      }
    } else {
      // All-time: simple average with slight growth drift based on trend
      const n = svcData.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      svcData.forEach((y, x) => {
        sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
      });
      const sSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      sumX = 0; sumY = 0; sumXY = 0; sumX2 = 0;
      pdtData.forEach((y, x) => {
        sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
      });
      const pSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

      const sAvg = svcData.reduce((a, b) => a + b, 0) / n;
      const pAvg = pdtData.reduce((a, b) => a + b, 0) / n;
      const sDrift = sSlope * 6; // 6-month drift
      const pDrift = pSlope * 6;

      for (let i = 1; i <= 12; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const factor = i / 12;
        forecast.push({
          month: monthStr,
          service: Math.max(0, sAvg + sDrift * factor),
          product: Math.max(0, pAvg + pDrift * factor),
        });
      }
    }
  } else if (method === 'trend') {
    const n = svcData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    svcData.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    const sSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const sIntercept = (sumY - sSlope * sumX) / n;

    sumX = 0; sumY = 0; sumXY = 0; sumX2 = 0;
    pdtData.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    const pSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const pIntercept = (sumY - pSlope * sumX) / n;

    for (let i = 1; i <= 12; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nextX = n + i - 1;
      forecast.push({
        month: monthStr,
        service: Math.max(0, sSlope * nextX + sIntercept),
        product: Math.max(0, pSlope * nextX + pIntercept),
      });
    }
  }

  return forecast;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as 'all' | 'service' | 'product' | null;
  const method = (searchParams.get('method') as ForecastMethod) || 'trend';
  const scope = (searchParams.get('scope') as ForecastScope) || 'all';
  const filterType = type || 'all';

  const db = getDb();

  let monthlyQuery = `
    SELECT month, type, currency, SUM(amount) as total, COUNT(*) as count
    FROM transactions
  `;
  const monthlyParams: string[] = [];

  if (filterType !== 'all') {
    monthlyQuery += ` WHERE type = ?`;
    monthlyParams.push(filterType);
  }

  monthlyQuery += ` GROUP BY month, type, currency ORDER BY month DESC`;

  const monthlyRows = db.prepare(monthlyQuery).all(...monthlyParams) as MonthlyRow[] & { currency: string }[];

  const monthlyReversed = monthlyRows.reverse();

  const monthlyMap: Record<string, { service: number; product: number }> = {};
  for (const row of monthlyReversed) {
    if (!monthlyMap[row.month]) monthlyMap[row.month] = { service: 0, product: 0 };
    if (row.type === 'service') monthlyMap[row.month].service += row.total;
    if (row.type === 'product') monthlyMap[row.month].product += row.total;
  }

  const historical = Object.entries(monthlyMap).map(([month, vals]) => ({
    month,
    service: vals.service,
    product: vals.product,
  }));

  const forecast = computeForecast(historical, method, scope);

  const forecastRows: MonthlyRow[] = forecast.map((f) => ({
    month: f.month,
    type: 'forecast',
    total: f.service + f.product,
    count: 0,
    service: f.service,
    product: f.product,
  }));

  const customerQuery = `
    SELECT customer, currency, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    ${filterType !== 'all' ? 'WHERE type = ?' : ''}
    GROUP BY customer, currency HAVING customer IS NOT NULL AND customer != '' ORDER BY total DESC
  `;
  const customerParams = filterType !== 'all' ? [filterType] : [];
  const customerRawRows = db.prepare(customerQuery).all(...customerParams) as {
    customer: string;
    currency: string;
    total: number;
    count: number;
  }[];

  const customerMap = new Map<string, { customer: string; total: number; count: number; currencies: { currency: string; amount: number; count: number }[] }>();
  for (const row of customerRawRows) {
    if (!customerMap.has(row.customer)) {
      customerMap.set(row.customer, { customer: row.customer, total: 0, count: 0, currencies: [] });
    }
    const entry = customerMap.get(row.customer)!;
    entry.total += row.total;
    entry.count += row.count;
    entry.currencies.push({ currency: row.currency, amount: row.total, count: row.count });
  }
  const customerRows = [...customerMap.values()].sort((a, b) => b.total - a.total).slice(0, 10);

  const statusQuery = `
    SELECT status, currency, COUNT(*) as count, SUM(amount) as total
    FROM transactions
    ${filterType !== 'all' ? 'WHERE type = ?' : ''}
    GROUP BY status, currency ORDER BY count DESC
  `;
  const statusRawRows = db.prepare(statusQuery).all(...customerParams) as {
    status: string;
    currency: string;
    count: number;
    total: number;
  }[];

  const statusMap = new Map<string, { status: string; count: number; total: number; currencies: { currency: string; amount: number; count: number }[] }>();
  for (const row of statusRawRows) {
    const key = row.status || 'Unknown';
    if (!statusMap.has(key)) {
      statusMap.set(key, { status: row.status, count: 0, total: 0, currencies: [] });
    }
    const entry = statusMap.get(key)!;
    entry.count += row.count;
    entry.total += row.total;
    entry.currencies.push({ currency: row.currency, amount: row.total, count: row.count });
  }
  const statusRows = [...statusMap.values()].sort((a, b) => b.count - a.count);

  const typeSplitRows = db.prepare(`
    SELECT type, currency, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    GROUP BY type, currency
  `).all() as { type: string; currency: string; total: number; count: number }[];

  const overallByCurrency = db.prepare(`
    SELECT currency, SUM(amount) as total, COUNT(*) as count FROM transactions GROUP BY currency
  `).all() as { currency: string; total: number; count: number }[];

  const overallRows = db.prepare(`
    SELECT SUM(amount) as total, COUNT(*) as count FROM transactions
  `).all() as { total: number; count: number }[];

  return NextResponse.json({
    monthly: [...monthlyReversed, ...forecastRows],
    topCustomers: customerRows,
    statusBreakdown: statusRows,
    typeSplit: typeSplitRows,
    overall: overallRows[0] || { total: 0, count: 0 },
    overallByCurrency,
  });
}