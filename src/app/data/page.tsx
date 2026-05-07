'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
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
  const [convertToUsd, setConvertToUsd] = useState(true);

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
      convertToUsd={convertToUsd}
      onConvertToUsdChange={setConvertToUsd}
      showClearFilters={!!selectedCustomer || !!selectedStatus}
      onClearFilters={clearFilters}
    />
  );
}

export default function DataPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    }>
      <DataPageContent />
    </Suspense>
  );
}
