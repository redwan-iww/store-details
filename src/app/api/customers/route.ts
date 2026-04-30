import { NextRequest, NextResponse } from 'next/server';
import { getCustomers } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as 'all' | 'service' | 'product' | null;

  const customers = getCustomers(type || 'all');
  return NextResponse.json({ customers });
}