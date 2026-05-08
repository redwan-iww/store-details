import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/adapters/sqlite';

interface CurrencyBreakdown {
  currency: string;
  amount: number;
  count: number;
}

interface WorkloadItem {
  month: string;
  serviceType: string;
  invoiceCount: number;
  currencies: CurrencyBreakdown[];
  customerCount: number;
}

interface SubscriptionTrend {
  month: string;
  activeSubscriptions: number;
  active: number;
  inactive: number;
  currencies: CurrencyBreakdown[];
}

interface TransactionVolume {
  month: string;
  transactionCount: number;
  currencies: CurrencyBreakdown[];
  upgrades: number;
  recurring: number;
}

interface ServiceBreakdown {
  service: string;
  totalInvoices: number;
  currencies: CurrencyBreakdown[];
  customerCount: number;
  trend: 'up' | 'down' | 'stable';
}

interface CustomerWorkload {
  customer: string;
  invoiceCount: number;
  currencies: CurrencyBreakdown[];
  activeSubscriptions: number;
  extensionCount: number;
  workloadScore: number;
}

interface ResourceForecast {
  month: string;
  projectedInvoices: number;
  projectedSubscriptions: number;
  projectedExtensions: number;
  capacityUtilization: number;
  recommendation: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const months = parseInt(searchParams.get('months') || '12');

  const db = getDb();

  const workloadRaw = db.prepare(`
    SELECT
      substr(date, 1, 7) as month,
      description as serviceType,
      currency,
      COUNT(*) as invoiceCount,
      SUM(amount) as totalRevenue,
      COUNT(DISTINCT customer) as customerCount
    FROM transactions
    WHERE source_file = 'Books_Invoice'
    GROUP BY month, description, currency
    ORDER BY month DESC
  `).all() as Array<{
    month: string;
    serviceType: string;
    currency: string;
    invoiceCount: number;
    totalRevenue: number;
    customerCount: number;
  }>;

  const workloadByMonthMap = new Map<string, Map<string, WorkloadItem>>();
  for (const row of workloadRaw) {
    if (!workloadByMonthMap.has(row.month)) {
      workloadByMonthMap.set(row.month, new Map());
    }
    const monthMap = workloadByMonthMap.get(row.month)!;
    if (!monthMap.has(row.serviceType)) {
      monthMap.set(row.serviceType, {
        month: row.month,
        serviceType: row.serviceType,
        invoiceCount: 0,
        currencies: [],
        customerCount: 0,
      });
    }
    const item = monthMap.get(row.serviceType)!;
    item.invoiceCount += row.invoiceCount;
    item.customerCount = Math.max(item.customerCount, row.customerCount);
    item.currencies.push({ currency: row.currency, amount: row.totalRevenue, count: row.invoiceCount });
  }

  const workloadByMonth: WorkloadItem[] = [];
  for (const monthMap of workloadByMonthMap.values()) {
    for (const item of monthMap.values()) {
      workloadByMonth.push(item);
    }
  }
  workloadByMonth.sort((a, b) => b.month.localeCompare(a.month) || a.serviceType.localeCompare(b.serviceType));

  const capacityMetrics = db.prepare(`
    SELECT
      substr(date, 1, 7) as month,
      COUNT(*) as newInstalls,
      COUNT(CASE WHEN status = 'Active' THEN 1 END) as activeUsers,
      COUNT(CASE WHEN status = 'Trial' THEN 1 END) as trialUsers
    FROM transactions
    WHERE source_file = 'Extension_Users'
    GROUP BY month
    ORDER BY month DESC
    LIMIT ?
  `).all(months) as Array<{
    month: string;
    newInstalls: number;
    activeUsers: number;
    trialUsers: number;
  }>;

  const subscriptionRaw = db.prepare(`
    SELECT
      substr(date, 1, 7) as month,
      currency,
      COUNT(*) as activeSubscriptions,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
      SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as recurringRevenue
    FROM transactions
    WHERE source_file = 'Store_Subscriptions'
    GROUP BY month, currency
    ORDER BY month DESC
  `).all() as Array<{
    month: string;
    currency: string;
    activeSubscriptions: number;
    active: number;
    inactive: number;
    recurringRevenue: number;
  }>;

  const subscriptionMap = new Map<string, SubscriptionTrend>();
  for (const row of subscriptionRaw) {
    if (!subscriptionMap.has(row.month)) {
      subscriptionMap.set(row.month, {
        month: row.month,
        activeSubscriptions: 0,
        active: 0,
        inactive: 0,
        currencies: [],
      });
    }
    const item = subscriptionMap.get(row.month)!;
    item.activeSubscriptions += row.activeSubscriptions;
    item.active += row.active;
    item.inactive += row.inactive;
    if (row.recurringRevenue > 0) {
      item.currencies.push({ currency: row.currency, amount: row.recurringRevenue, count: row.active });
    }
  }
  const subscriptionTrends = [...subscriptionMap.values()].slice(0, months);

  const transactionRaw = db.prepare(`
    SELECT
      substr(date, 1, 7) as month,
      currency,
      COUNT(*) as transactionCount,
      SUM(amount) as totalAmount,
      COUNT(CASE WHEN status = 'upgrade' THEN 1 END) as upgrades,
      COUNT(CASE WHEN status = 'recurring' THEN 1 END) as recurring
    FROM transactions
    WHERE source_file = 'Store_Transactions'
    GROUP BY month, currency
    ORDER BY month DESC
  `).all() as Array<{
    month: string;
    currency: string;
    transactionCount: number;
    totalAmount: number;
    upgrades: number;
    recurring: number;
  }>;

  const transactionMap = new Map<string, TransactionVolume>();
  for (const row of transactionRaw) {
    if (!transactionMap.has(row.month)) {
      transactionMap.set(row.month, {
        month: row.month,
        transactionCount: 0,
        currencies: [],
        upgrades: 0,
        recurring: 0,
      });
    }
    const item = transactionMap.get(row.month)!;
    item.transactionCount += row.transactionCount;
    item.upgrades += row.upgrades;
    item.recurring += row.recurring;
    item.currencies.push({ currency: row.currency, amount: row.totalAmount, count: row.transactionCount });
  }
  const transactionVolume = [...transactionMap.values()].slice(0, months);

  const serviceRaw = db.prepare(`
    SELECT
      description as service,
      currency,
      COUNT(*) as totalInvoices,
      SUM(amount) as totalRevenue,
      COUNT(DISTINCT customer) as customerCount
    FROM transactions
    WHERE source_file = 'Books_Invoice'
    GROUP BY description, currency
    ORDER BY totalRevenue DESC
  `).all() as Array<{
    service: string;
    currency: string;
    totalInvoices: number;
    totalRevenue: number;
    customerCount: number;
  }>;

  const serviceMap = new Map<string, ServiceBreakdown>();
  for (const row of serviceRaw) {
    if (!serviceMap.has(row.service)) {
      serviceMap.set(row.service, {
        service: row.service,
        totalInvoices: 0,
        currencies: [],
        customerCount: 0,
        trend: 'stable',
      });
    }
    const item = serviceMap.get(row.service)!;
    item.totalInvoices += row.totalInvoices;
    item.customerCount = Math.max(item.customerCount, row.customerCount);
    item.currencies.push({ currency: row.currency, amount: row.totalRevenue, count: row.totalInvoices });
  }

  const serviceWithTrends = [...serviceMap.values()].map(s => {
    const monthlyData = workloadByMonth
      .filter(w => w.serviceType === s.service)
      .sort((a, b) => a.month.localeCompare(b.month));

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (monthlyData.length >= 2) {
      const firstTotal = monthlyData[0].currencies.reduce((sum, c) => sum + c.amount, 0);
      const lastTotal = monthlyData[monthlyData.length - 1].currencies.reduce((sum, c) => sum + c.amount, 0);
      if (lastTotal > firstTotal * 1.1) trend = 'up';
      else if (lastTotal < firstTotal * 0.9) trend = 'down';
    }

    return { ...s, trend };
  });

  const customerRaw = db.prepare(`
    SELECT
      t.customer,
      t.currency,
      COUNT(DISTINCT t.id) as invoiceCount,
      SUM(t.amount) as totalRevenue
    FROM transactions t
    WHERE t.source_file = 'Books_Invoice'
    GROUP BY t.customer, t.currency
    ORDER BY totalRevenue DESC
  `).all() as Array<{
    customer: string;
    currency: string;
    invoiceCount: number;
    totalRevenue: number;
  }>;

  const customerMap = new Map<string, CustomerWorkload>();
  for (const row of customerRaw) {
    if (!customerMap.has(row.customer)) {
      customerMap.set(row.customer, {
        customer: row.customer,
        invoiceCount: 0,
        currencies: [],
        activeSubscriptions: 0,
        extensionCount: 0,
        workloadScore: 0,
      });
    }
    const item = customerMap.get(row.customer)!;
    item.invoiceCount += row.invoiceCount;
    item.currencies.push({ currency: row.currency, amount: row.totalRevenue, count: row.invoiceCount });
  }

  const customerWithScores = [...customerMap.values()].map(c => {
    const totalRevenue = c.currencies.reduce((sum, cur) => sum + cur.amount, 0);
    return {
      ...c,
      workloadScore: Math.round(
        c.invoiceCount * 10 +
        c.activeSubscriptions * 5 +
        c.extensionCount * 3 +
        (totalRevenue / 1000) * 2
      ),
    };
  }).sort((a, b) => b.workloadScore - a.workloadScore).slice(0, 20);

  const recentMonths = [...new Set(workloadByMonth.map(w => w.month))].slice(0, 6).reverse();
  const forecasts: ResourceForecast[] = [];

  for (let i = 1; i <= 3; i++) {
    const lastMonth = recentMonths[recentMonths.length - 1];
    const [year, month] = lastMonth.split('-').map(Number);
    const nextDate = new Date(year, month - 1 + i, 1);
    const forecastMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    const avgInvoices = workloadByMonth.reduce((sum, w) => sum + w.invoiceCount, 0) / Math.max(recentMonths.length, 1);
    const avgSubscriptions = subscriptionTrends.reduce((sum, s) => sum + s.activeSubscriptions, 0) / Math.max(subscriptionTrends.length, 1);
    const avgExtensions = capacityMetrics.reduce((sum, c) => sum + c.newInstalls, 0) / Math.max(capacityMetrics.length, 1);

    const growthFactor = 1.05;
    const projectedInvoices = Math.round(avgInvoices * growthFactor);
    const projectedSubscriptions = Math.round(avgSubscriptions * growthFactor);
    const projectedExtensions = Math.round(avgExtensions * growthFactor);

    const baseCapacity = 100;
    const utilization = Math.min(
      ((projectedInvoices * 0.4 + projectedExtensions * 0.3 + projectedSubscriptions * 0.01) / baseCapacity) * 100,
      100
    );

    let recommendation = 'Maintain current capacity';
    if (utilization > 85) recommendation = 'Consider hiring additional resources';
    else if (utilization > 70) recommendation = 'Monitor closely, plan for scaling';
    else if (utilization < 40) recommendation = 'Capacity underutilized, consider optimization';

    forecasts.push({
      month: forecastMonth,
      projectedInvoices,
      projectedSubscriptions,
      projectedExtensions,
      capacityUtilization: Math.round(utilization),
      recommendation,
    });
  }

  const allCurrencies = db.prepare(`
    SELECT DISTINCT currency FROM transactions WHERE currency IS NOT NULL AND currency != '' ORDER BY currency
  `).all() as Array<{ currency: string }>;

  return NextResponse.json({
    workloadByMonth,
    capacityMetrics,
    subscriptionTrends,
    transactionVolume,
    serviceBreakdown: serviceWithTrends,
    customerWorkload: customerWithScores,
    forecasts,
    currencies: allCurrencies.map(c => c.currency),
    summary: {
      totalInvoices: workloadByMonth.reduce((sum, w) => sum + w.invoiceCount, 0),
      activeSubscriptions: subscriptionTrends[0]?.active || 0,
      activeExtensions: capacityMetrics[0]?.activeUsers || 0,
      avgCapacityUtilization: forecasts.reduce((sum, f) => sum + f.capacityUtilization, 0) / Math.max(forecasts.length, 1),
    },
  });
}
