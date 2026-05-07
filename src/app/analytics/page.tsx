'use client';

import { useState, useEffect } from 'react';
import RevenueAnalytics from '@/components/RevenueAnalytics';

interface AnalyticsData {
  monthly: { month: string; type: string; total: number; count: number }[];
  topCustomers: { customer: string; total: number; count: number; currencies: import('@/lib/currency').CurrencyBreakdown[] }[];
  statusBreakdown: { status: string; count: number; total: number; currencies: import('@/lib/currency').CurrencyBreakdown[] }[];
  typeSplit: { type: string; currency: string; total: number; count: number }[];
  overall: { total: number; count: number };
  overallByCurrency: { currency: string; total: number; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'service' | 'product'>('all');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?type=${typeFilter}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [typeFilter]);

  return (
    <RevenueAnalytics
      data={data}
      loading={loading}
      typeFilter={typeFilter}
      onTypeFilterChange={setTypeFilter}
    />
  );
}
