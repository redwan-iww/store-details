'use client';

import FilterBar from '@/components/FilterBar';
import DataTable from '@/components/DataTable';
import type { RecordType } from '@/lib/types';
import type { Transaction } from '@/lib/types';

interface HomeContentProps {
  currentMonth: string;
  currentType: 'all' | RecordType;
  selectedCustomer: string;
  selectedStatus: string;
  customers: string[];
  statuses: string[];
  records: Transaction[];
  summary: { totalAmount: number; count: number };
  loading: boolean;
  onMonthChange: (month: string) => void;
  onTypeChange: (type: 'all' | RecordType) => void;
  onCustomerChange: (customer: string) => void;
  onStatusChange: (status: string) => void;
}

export default function HomeContent({
  currentMonth,
  currentType,
  selectedCustomer,
  selectedStatus,
  customers,
  statuses,
  records,
  summary,
  loading,
  onMonthChange,
  onTypeChange,
  onCustomerChange,
  onStatusChange,
}: HomeContentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <>
      <FilterBar
        currentMonth={currentMonth}
        onMonthChange={onMonthChange}
        currentType={currentType}
        onTypeChange={onTypeChange}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onCustomerChange={onCustomerChange}
        statuses={statuses}
        selectedStatus={selectedStatus}
        onStatusChange={onStatusChange}
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
    </>
  );
}