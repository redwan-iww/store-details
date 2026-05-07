import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/adapters/sqlite';

interface TimelineMilestone {
  id: string;
  date: string;
  type: 'invoice' | 'subscription' | 'transaction' | 'extension';
  recordType: 'service' | 'product';
  category: 'payment_due' | 'payment_received' | 'renewal' | 'upgrade' | 'install' | 'expiry' | 'reactivation' | 'commission';
  customer: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: 'upcoming' | 'completed' | 'overdue' | 'at_risk';
  source: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customer = searchParams.get('customer');
  const daysAhead = parseInt(searchParams.get('daysAhead') || '90');
  const daysBack = parseInt(searchParams.get('daysBack') || '30');
  const recordType = searchParams.get('type');

  const db = getDb();
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysBack);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const milestones: TimelineMilestone[] = [];

  const showService = !recordType || recordType === 'service';
  const showProduct = !recordType || recordType === 'product';

  if (showService) {
    let invoiceQuery = `
      SELECT id, customer, description, amount, currency, status, date, raw_data
      FROM transactions
      WHERE source_file = 'Books_Invoice' AND date >= ? AND date <= ?
    `;
    const invoiceParams: string[] = [startDateStr, endDateStr];

    if (customer) {
      invoiceQuery += ` AND customer = ?`;
      invoiceParams.push(customer);
    }

    const invoices = db.prepare(invoiceQuery).all(...invoiceParams) as Array<{
      id: string;
      customer: string;
      description: string;
      amount: number;
      currency: string;
      status: string;
      date: string;
      raw_data: string;
    }>;

    for (const inv of invoices) {
      const raw = JSON.parse(inv.raw_data || '{}');
      const dueDate = raw['Due Date'] as string | undefined;
      const paymentDate = raw['Last Payment Date'] as string | undefined;

      if (dueDate && dueDate >= startDateStr && dueDate <= endDateStr) {
        let status: 'upcoming' | 'completed' | 'overdue' | 'at_risk' = 'upcoming';
        if (inv.status === 'Closed') status = 'completed';
        else if (dueDate < todayStr) status = 'overdue';
        else if (dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) status = 'at_risk';

        milestones.push({
          id: `${inv.id}-due`,
          date: dueDate,
          type: 'invoice',
          recordType: 'service',
          category: 'payment_due',
          customer: inv.customer,
          title: `Payment Due - ${inv.customer}`,
          description: inv.description,
          amount: inv.amount,
          currency: inv.currency,
          status,
          source: 'Books_Invoice',
        });
      }

      if (paymentDate && paymentDate >= startDateStr && paymentDate <= endDateStr) {
        milestones.push({
          id: `${inv.id}-paid`,
          date: paymentDate,
          type: 'invoice',
          recordType: 'service',
          category: 'payment_received',
          customer: inv.customer,
          title: `Payment Received - ${inv.customer}`,
          description: inv.description,
          amount: inv.amount,
          currency: inv.currency,
          status: 'completed',
          source: 'Books_Invoice',
        });
      }
    }
  }

  if (showProduct) {
    let subQuery = `
      SELECT id, customer, description, amount, currency, status, date, raw_data
      FROM transactions
      WHERE source_file = 'Store_Subscriptions' AND date >= ? AND date <= ?
    `;
    const subParams: string[] = [startDateStr, endDateStr];

    if (customer) {
      subQuery += ` AND customer = ?`;
      subParams.push(customer);
    }

    const subscriptions = db.prepare(subQuery).all(...subParams) as Array<{
      id: string;
      customer: string;
      description: string;
      amount: number;
      currency: string;
      status: string;
      date: string;
      raw_data: string;
    }>;

    for (const sub of subscriptions) {
      const raw = JSON.parse(sub.raw_data || '{}');
      const nextRecurring = raw['next_recurring_date'] as string | undefined;

      if (nextRecurring && nextRecurring >= startDateStr && nextRecurring <= endDateStr) {
        let status: 'upcoming' | 'completed' | 'overdue' | 'at_risk' = 'upcoming';
        if (sub.status === 'active') status = 'upcoming';
        else if (sub.status === 'inactive') status = 'at_risk';

        milestones.push({
          id: `${sub.id}-renewal`,
          date: nextRecurring,
          type: 'subscription',
          recordType: 'product',
          category: 'renewal',
          customer: sub.customer,
          title: `Subscription Renewal - ${sub.customer}`,
          description: `${raw['service_name'] || ''} - ${raw['plan_name'] || ''}`,
          amount: raw['next_recurring_amount_usd'] || sub.amount,
          currency: 'USD',
          status,
          source: 'Store_Subscriptions',
        });
      }
    }

    let txnQuery = `
      SELECT id, customer, description, amount, currency, status, date, raw_data
      FROM transactions
      WHERE source_file = 'Store_Transactions' AND date >= ? AND date <= ?
    `;
    const txnParams: string[] = [startDateStr, endDateStr];

    if (customer) {
      txnQuery += ` AND customer = ?`;
      txnParams.push(customer);
    }

    const transactions = db.prepare(txnQuery).all(...txnParams) as Array<{
      id: string;
      customer: string;
      description: string;
      amount: number;
      currency: string;
      status: string;
      date: string;
      raw_data: string;
    }>;

    for (const txn of transactions) {
      const raw = JSON.parse(txn.raw_data || '{}');
      const txnType = raw['transaction_type'] as string | undefined;

      let category: TimelineMilestone['category'] | null = null;
      let title = '';

      if (txnType === 'upgrade') {
        category = 'upgrade';
        title = `Upgrade - ${txn.customer}`;
      } else if (txnType === 'reactivation' || (txn.description && txn.description.toLowerCase().includes('reactivat'))) {
        category = 'reactivation';
        title = `Reactivation - ${txn.customer}`;
      }

      if (category) {
        milestones.push({
          id: `${txn.id}-event`,
          date: txn.date,
          type: 'transaction',
          recordType: 'product',
          category,
          customer: txn.customer,
          title,
          description: txn.description,
          amount: txn.amount,
          currency: txn.currency,
          status: 'completed',
          source: 'Store_Transactions',
        });
      }
    }

    let extQuery = `
      SELECT id, customer, description, amount, currency, status, date, raw_data
      FROM transactions
      WHERE source_file = 'Extension_Users' AND date >= ? AND date <= ?
    `;
    const extParams: string[] = [startDateStr, endDateStr];

    if (customer) {
      extQuery += ` AND customer = ?`;
      extParams.push(customer);
    }

    const extensions = db.prepare(extQuery).all(...extParams) as Array<{
      id: string;
      customer: string;
      description: string;
      amount: number;
      currency: string;
      status: string;
      date: string;
      raw_data: string;
    }>;

    for (const ext of extensions) {
      const raw = JSON.parse(ext.raw_data || '{}');
      const validity = raw['Extension Validty'] as string | undefined;

      milestones.push({
        id: `${ext.id}-install`,
        date: ext.date,
        type: 'extension',
        recordType: 'product',
        category: 'install',
        customer: ext.customer,
        title: `Extension Installed - ${ext.customer}`,
        description: ext.description,
        amount: 0,
        currency: ext.currency,
        status: 'completed',
        source: 'Extension_Users',
      });

      if (validity && validity >= startDateStr && validity <= endDateStr && validity !== '2065-01-01') {
        let status: 'upcoming' | 'completed' | 'overdue' | 'at_risk' = 'upcoming';
        if (validity < todayStr) status = 'overdue';
        else if (validity <= new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) status = 'at_risk';

        milestones.push({
          id: `${ext.id}-expiry`,
          date: validity,
          type: 'extension',
          recordType: 'product',
          category: 'expiry',
          customer: ext.customer,
          title: `Extension Expiry - ${ext.customer}`,
          description: ext.description,
          amount: 0,
          currency: ext.currency,
          status,
          source: 'Extension_Users',
        });
      }
    }
  }

  milestones.sort((a, b) => a.date.localeCompare(b.date));

  const summary = {
    total: milestones.length,
    upcoming: milestones.filter(m => m.status === 'upcoming').length,
    overdue: milestones.filter(m => m.status === 'overdue').length,
    at_risk: milestones.filter(m => m.status === 'at_risk').length,
    completed: milestones.filter(m => m.status === 'completed').length,
    totalAmount: milestones.reduce((sum, m) => sum + m.amount, 0),
  };

  return NextResponse.json({ milestones, summary, range: { start: startDateStr, end: endDateStr } });
}
