'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

interface AnalyticsData {
  monthly: { month: string; type: string; total: number; count: number }[];
  topCustomers: { customer: string; total: number; count: number }[];
  statusBreakdown: { status: string; count: number; total: number }[];
  typeSplit: { type: string; total: number; count: number }[];
  overall: { total: number; count: number };
}

export default function Home() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:z-50 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Skip to main content
      </a>

      {/* Header / Banner */}
      <header role="banner" className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-600 mt-0.5">Revenue and usage insights</p>
          </div>
          <Link
            href="/data"
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            View Data
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="p-6">
        <AnalyticsDashboard
          data={data}
          loading={loading}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />
      </main>
    </div>
  );
}