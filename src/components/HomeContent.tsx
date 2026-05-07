'use client';

import { useState, useEffect } from 'react';
import FilterBar from '@/components/FilterBar';
import DataTable from '@/components/DataTable';
import { CurrencyConverterToggle, ExchangeRateModal } from '@/components/CurrencyUI';
import { formatCurrency, DEFAULT_EXCHANGE_RATES } from '@/lib/currency';
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
  hideMonthFilter?: boolean;
  convertToUsd?: boolean;
  onConvertToUsdChange?: (value: boolean) => void;
  showClearFilters?: boolean;
  onClearFilters?: () => void;
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
  hideMonthFilter,
  convertToUsd = true,
  onConvertToUsdChange,
  showClearFilters,
  onClearFilters,
}: HomeContentProps) {
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_EXCHANGE_RATES);
  const [showRateEditor, setShowRateEditor] = useState(false);

  const currenciesInData = [...new Set(records.map(r => r.currency || 'USD'))];

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
        hideMonthFilter={hideMonthFilter}
      />

      {showClearFilters && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-4 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Clear Filter
        </button>
      )}

      {/* Summary Cards */}
      <section aria-labelledby="summary-heading" className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 id="summary-heading" className="text-sm font-semibold text-slate-900">Summary</h2>
          <div className="flex items-center gap-4">
            {onConvertToUsdChange && (
              <>
                <button
                  onClick={() => setShowRateEditor(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                >
                  Edit rates
                </button>
                <CurrencyConverterToggle enabled={convertToUsd} onToggle={onConvertToUsdChange} />
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <article
            aria-labelledby="card-total-heading"
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
          >
            <h3 id="card-total-heading" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Amount</h3>
            <p
              id="card-total-value"
              className="text-2xl font-semibold text-slate-900 mt-2"
              aria-live="polite"
              aria-describedby="card-total-heading"
            >
              {loading ? (
                <span className="text-slate-400">Loading…</span>
              ) : (
                formatCurrency(summary.totalAmount, 'USD', convertToUsd, exchangeRates)
              )}
            </p>
          </article>
          <article
            aria-labelledby="card-count-heading"
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
          >
            <h3 id="card-count-heading" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Record Count</h3>
            <p
              id="card-count-value"
              className="text-2xl font-semibold text-slate-900 mt-2"
              aria-live="polite"
              aria-describedby="card-count-heading"
            >
              {loading ? (
                <span className="text-slate-400">Loading…</span>
              ) : (
                summary.count.toLocaleString()
              )}
            </p>
          </article>
          <article
            aria-labelledby="card-filter-heading"
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
          >
            <h3 id="card-filter-heading" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Currently Showing</h3>
            <p
              id="card-filter-value"
              className="text-2xl font-semibold text-slate-900 capitalize mt-2"
              aria-live="polite"
            >
              {currentType}
              {selectedCustomer && <span className="text-base font-normal text-slate-500"> — {selectedCustomer}</span>}
            </p>
          </article>
        </div>
      </section>

      <ExchangeRateModal
        rates={exchangeRates}
        onRatesChange={setExchangeRates}
        currencies={currenciesInData}
        open={showRateEditor}
        onClose={() => setShowRateEditor(false)}
      />

      {/* Data Table */}
      <section aria-labelledby="records-heading" className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
          <h2 id="records-heading" className="text-sm font-semibold text-slate-900">Records</h2>
          <div className="flex items-center gap-4 text-sm text-slate-500">
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
        <DataTable records={records} type={currentType} convertToUsd={convertToUsd} exchangeRates={exchangeRates} />
      </section>
    </>
  );
}
