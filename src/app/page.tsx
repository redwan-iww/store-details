'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import FilterBar from '@/components/FilterBar';
import DataTable from '@/components/DataTable';
import type { RecordType } from '@/lib/types';

export default function Home() {
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [currentType, setCurrentType] = useState<'all' | RecordType>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [customers, setCustomers] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [records, setRecords] = useState<import('@/lib/types').Transaction[]>([]);
  const [summary, setSummary] = useState<{ totalAmount: number; count: number }>({ totalAmount: 0, count: 0 });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: currentMonth, type: currentType });
      if (selectedCustomer) params.set('customer', selectedCustomer);
      if (selectedStatus) params.set('status', selectedStatus);

      const res = await fetch(`/api/data?${params}`);
      const data = await res.json();
      setRecords(data.records || []);
      setSummary(data.summary || { totalAmount: 0, count: 0 });
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentType, selectedCustomer, selectedStatus]);

  const fetchCustomers = useCallback(async (type: 'all' | RecordType) => {
    try {
      const res = await fetch(`/api/customers?type=${type}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  }, []);

  const fetchStatuses = useCallback(async (type: 'all' | RecordType) => {
    try {
      const res = await fetch(`/api/statuses?type=${type}`);
      const data = await res.json();
      setStatuses(data.statuses || []);
    } catch (err) {
      console.error('Failed to fetch statuses:', err);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(currentType);
    fetchStatuses(currentType);
    setSelectedCustomer('');
    setSelectedStatus('');
  }, [currentType, fetchCustomers, fetchStatuses]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

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
            <h1 className="text-xl font-semibold text-gray-900">Store Data Viewer</h1>
            <p className="text-sm text-gray-600 mt-0.5">7 years of Zoho store data — filter by month, service, product, or customer</p>
          </div>
          <Link
            href="/analytics"
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            Analytics
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="p-6">
        <FilterBar
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          currentType={currentType}
          onTypeChange={setCurrentType}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onCustomerChange={setSelectedCustomer}
          statuses={statuses}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {/* Summary Cards */}
        <section aria-labelledby="summary-heading" className="mt-6">
          <h2 id="summary-heading" className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <article
              aria-labelledby="card-total-heading"
              className="bg-white rounded-lg shadow p-5 border border-gray-200"
            >
              <h3 id="card-total-heading" className="text-sm font-medium text-gray-600">Total Amount</h3>
              <p
                id="card-total-value"
                className="text-2xl font-bold text-gray-900 mt-1"
                aria-live="polite"
                aria-describedby="card-total-heading"
              >
                {loading ? (
                  <span className="text-gray-400">Loading…</span>
                ) : (
                  formatCurrency(summary.totalAmount)
                )}
              </p>
            </article>
            <article
              aria-labelledby="card-count-heading"
              className="bg-white rounded-lg shadow p-5 border border-gray-200"
            >
              <h3 id="card-count-heading" className="text-sm font-medium text-gray-600">Record Count</h3>
              <p
                id="card-count-value"
                className="text-2xl font-bold text-gray-900 mt-1"
                aria-live="polite"
                aria-describedby="card-count-heading"
              >
                {loading ? (
                  <span className="text-gray-400">Loading…</span>
                ) : (
                  summary.count.toLocaleString()
                )}
              </p>
            </article>
            <article
              aria-labelledby="card-filter-heading"
              className="bg-white rounded-lg shadow p-5 border border-gray-200"
            >
              <h3 id="card-filter-heading" className="text-sm font-medium text-gray-600">Currently Showing</h3>
              <p
                id="card-filter-value"
                className="text-2xl font-bold text-gray-900 capitalize mt-1"
                aria-live="polite"
              >
                {currentType}
                {selectedCustomer && <span className="text-base font-normal text-gray-600"> — {selectedCustomer}</span>}
              </p>
            </article>
          </div>
        </section>

        {/* Data Table */}
        <section aria-labelledby="records-heading" className="mt-6 bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b flex justify-between items-center flex-wrap gap-2">
            <h2 id="records-heading" className="font-semibold text-gray-900">Records</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {loading ? (
                <span role="status" aria-live="polite" className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" aria-hidden="true" />
                  Loading...
                </span>
              ) : null}
              <span aria-live="polite" aria-atomic="true">
                {records.length} {records.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>
          <DataTable records={records} type={currentType} />
        </section>
      </main>
    </div>
  );
}