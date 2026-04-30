import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/adapters/sqlite';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as 'all' | 'service' | 'product' | null;
  const filterType = type || 'all';

  const db = getDb();

  // Monthly totals for the last 24 months
  let monthlyQuery = `
    SELECT month, type, SUM(amount) as total, COUNT(*) as count
    FROM transactions
  `;
  const monthlyParams: string[] = [];

  if (filterType !== 'all') {
    monthlyQuery += ` WHERE type = ?`;
    monthlyParams.push(filterType);
  }

  monthlyQuery += ` GROUP BY month, type ORDER BY month DESC LIMIT 48`;

  const monthlyRows = db.prepare(monthlyQuery).all(...monthlyParams) as {
    month: string;
    type: string;
    total: number;
    count: number;
  }[];

  // Top customers by revenue
  let customerQuery = `
    SELECT customer, SUM(amount) as total, COUNT(*) as count
    FROM transactions
  `;
  const customerParams: string[] = [];

  if (filterType !== 'all') {
    customerQuery += ` WHERE type = ?`;
    customerParams.push(filterType);
  }

  customerQuery += ` GROUP BY customer HAVING customer IS NOT NULL AND customer != '' ORDER BY total DESC LIMIT 10`;

  const customerRows = db.prepare(customerQuery).all(...customerParams) as {
    customer: string;
    total: number;
    count: number;
  }[];

  // Status breakdown
  let statusQuery = `
    SELECT status, COUNT(*) as count, SUM(amount) as total
    FROM transactions
  `;
  const statusParams: string[] = [];

  if (filterType !== 'all') {
    statusQuery += ` WHERE type = ?`;
    statusParams.push(filterType);
  }

  statusQuery += ` GROUP BY status ORDER BY count DESC`;

  const statusRows = db.prepare(statusQuery).all(...statusParams) as {
    status: string;
    count: number;
    total: number;
  }[];

  // Service vs Product split (overall)
  const typeSplitRows = db.prepare(`
    SELECT type, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    GROUP BY type
  `).all() as { type: string; total: number; count: number }[];

  // Overall totals
  const overallRows = db.prepare(`
    SELECT SUM(amount) as total, COUNT(*) as count FROM transactions
  `).all() as { total: number; count: number }[];

  return NextResponse.json({
    monthly: monthlyRows.reverse(), // oldest first for charts
    topCustomers: customerRows,
    statusBreakdown: statusRows,
    typeSplit: typeSplitRows,
    overall: overallRows[0] || { total: 0, count: 0 },
  });
}