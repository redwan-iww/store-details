import { NextRequest, NextResponse } from 'next/server';
import { getTransactions } from '@/lib/db';
import type { DataFilters, RecordType } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month');
  const type = searchParams.get('type') as DataFilters['type'] | null;
  const customer = searchParams.get('customer') || undefined;
  const status = searchParams.get('status') || undefined;

  // month is optional when customer or status is provided
  if (!month && !customer && !status) {
    return NextResponse.json({ error: 'month or customer is required' }, { status: 400 });
  }

  if (type && !['all', 'service', 'product'].includes(type)) {
    return NextResponse.json({ error: 'type must be all, service, or product' }, { status: 400 });
  }

  const filters: DataFilters = {
    month: month || undefined,
    type: type || 'all',
    customer,
    status,
  };

  const result = getTransactions(filters);

  return NextResponse.json({
    month: month || 'all',
    type: filters.type,
    customer,
    status,
    ...result,
  });
}