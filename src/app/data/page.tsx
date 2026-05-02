'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import HomeContent from '@/components/HomeContent';
import type { RecordType } from '@/lib/types';

function DataPageContent() {
  const searchParams = useSearchParams();
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

  const customerParam = searchParams.get('customer') || '';
  const statusParam = searchParams.get('status') || '';

  useEffect(() => {
    if (customerParam && statusParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    }
    setSelectedCustomer(customerParam);
    setSelectedStatus(customerParam ? '' : statusParam);
  }, [customerParam, statusParam]);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCustomer) {
        params.set('customer', selectedCustomer);
      } else if (selectedStatus) {
        params.set('status', selectedStatus);
      } else {
        params.set('month', currentMonth);
        params.set('type', currentType);
      }

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

  useEffect(() => {
    fetchCustomers(currentType);
    fetchStatuses(currentType);
  }, [currentType, fetchCustomers, fetchStatuses]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('customer');
    url.searchParams.delete('status');
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {selectedCustomer ? `Customer: ${selectedCustomer}` : selectedStatus ? `Status: ${selectedStatus}` : 'Store Data Viewer'}
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              {selectedCustomer
                ? `Showing all transactions for ${selectedCustomer}`
                : selectedStatus
                ? `Showing all transactions with status ${selectedStatus}`
                : '7 years of Zoho store data — filter by month, service, product, or customer'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(selectedCustomer || selectedStatus) && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filter
              </button>
            )}
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              View Analytics
            </Link>
          </div>
        </div>
      </header>

      <main className="p-6">
        <HomeContent
          currentMonth={currentMonth}
          currentType={currentType}
          selectedCustomer={selectedCustomer}
          selectedStatus={selectedStatus}
          customers={customers}
          statuses={statuses}
          records={records}
          summary={summary}
          loading={loading}
          onMonthChange={setCurrentMonth}
          onTypeChange={setCurrentType}
          onCustomerChange={setSelectedCustomer}
          onStatusChange={setSelectedStatus}
          hideMonthFilter={!!selectedCustomer || !!selectedStatus}
        />
      </main>
    </div>
  );
}

export default function DataPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    }>
      <DataPageContent />
    </Suspense>
  );
}