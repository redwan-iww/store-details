'use client';

import { useState } from 'react';
import { formatCurrency, DEFAULT_EXCHANGE_RATES, type CurrencyBreakdown } from '@/lib/currency';
import { CurrencySummaryWithConversion, CurrencyBreakdownList, CurrencyConverterToggle, ExchangeRateModal } from '@/components/CurrencyUI';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface AnalyticsData {
  monthly: { month: string; type: string; total: number; count: number }[];
  topCustomers: { customer: string; total: number; count: number; currencies: CurrencyBreakdown[] }[];
  statusBreakdown: { status: string; count: number; total: number; currencies: CurrencyBreakdown[] }[];
  typeSplit: { type: string; currency: string; total: number; count: number }[];
  overall: { total: number; count: number };
  overallByCurrency: { currency: string; total: number; count: number }[];
}

interface RevenueAnalyticsProps {
  data: AnalyticsData | null;
  loading: boolean;
  typeFilter: 'all' | 'service' | 'product';
  onTypeFilterChange: (filter: 'all' | 'service' | 'product') => void;
}

export default function RevenueAnalytics({
  data,
  loading,
  typeFilter,
  onTypeFilterChange,
}: RevenueAnalyticsProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [convertToUsd, setConvertToUsd] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_EXCHANGE_RATES);
  const [showRateEditor, setShowRateEditor] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-slate-500">No data available</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Revenue Analytics</h2>
            <p className="text-sm text-slate-500 mt-0.5">Revenue by currency, top customers, and status breakdown</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRateEditor(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Edit rates
            </button>
            <CurrencyConverterToggle enabled={convertToUsd} onToggle={setConvertToUsd} />
            <div className="flex rounded-lg overflow-hidden border border-slate-200">
              {(['all', 'service', 'product'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onTypeFilterChange(t)}
                  className={`px-3 py-1.5 capitalize font-medium text-sm transition-colors ${
                    typeFilter === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Revenue by Currency */}
        {data.overallByCurrency && data.overallByCurrency.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Revenue by Currency</h3>
            <CurrencySummaryWithConversion currencies={data.overallByCurrency} convertToUsd={convertToUsd} rates={exchangeRates} />
          </div>
        )}

        <ExchangeRateModal
          rates={exchangeRates}
          onRatesChange={setExchangeRates}
          currencies={data.overallByCurrency.map(c => c.currency)}
          open={showRateEditor}
          onClose={() => setShowRateEditor(false)}
        />

        {/* Top Customers & By Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Top Customers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.topCustomers.map((c, i) => {
                const pct = (c.total / data.overall.total) * 100;
                const primaryCurrency = c.currencies?.[0]?.currency || 'USD';
                return (
                  <div key={c.customer} className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 transition-all">
                    <button
                      onClick={() => setSelectedCustomer(selectedCustomer === c.customer ? null : c.customer)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-lg font-bold text-slate-300">#{i + 1}</span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(c.total, primaryCurrency, convertToUsd, exchangeRates)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 truncate mb-1" title={c.customer}>
                        {c.customer}
                      </p>
                      <CurrencyBreakdownList currencies={c.currencies} inline convertToUsd={convertToUsd} rates={exchangeRates} />
                      <div className="flex items-center justify-between text-sm text-slate-500 mt-1">
                        <span>{pct.toFixed(1)}% of total</span>
                        <span>{c.count} records</span>
                      </div>
                      <div className="mt-2 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </button>
                    {selectedCustomer === c.customer && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <a
                          href={`/data?type=all&customer=${encodeURIComponent(c.customer)}`}
                          className="block text-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 mb-2"
                        >
                          View in Data Page
                        </a>
                        <p className="text-sm text-slate-500 text-center">
                          {c.count} transactions
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Status */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">By Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.statusBreakdown.map((s, i) => {
                const pct = (s.count / data.overall.count) * 100;
                const statusKey = s.status || 'Unknown';
                return (
                  <div key={s.status} className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 transition-all">
                    <button
                      onClick={() => setSelectedStatus(selectedStatus === statusKey ? null : statusKey)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {s.status || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-slate-900">{s.count.toLocaleString()}</p>
                      <CurrencyBreakdownList currencies={s.currencies} inline convertToUsd={convertToUsd} rates={exchangeRates} />
                      <p className="text-sm text-slate-500 mt-1">{pct.toFixed(1)}%</p>
                    </button>
                    {selectedStatus === statusKey && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <a
                          href={`/data?type=all&status=${encodeURIComponent(s.status || '')}`}
                          className="block text-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 mb-2"
                        >
                          View in Data Page
                        </a>
                        <p className="text-sm text-slate-500 text-center">
                          {s.count} transactions
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
