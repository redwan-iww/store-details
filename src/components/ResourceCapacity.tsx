'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, DEFAULT_EXCHANGE_RATES, type CurrencyBreakdown } from '@/lib/currency';
import { CurrencyBreakdownList, CurrencyConverterToggle, ExchangeRateModal } from '@/components/CurrencyUI';

interface WorkloadItem {
  month: string;
  serviceType: string;
  invoiceCount: number;
  currencies: CurrencyBreakdown[];
  customerCount: number;
}

interface CapacityMetric {
  month: string;
  newInstalls: number;
  activeUsers: number;
  trialUsers: number;
}

interface SubscriptionTrend {
  month: string;
  activeSubscriptions: number;
  active: number;
  inactive: number;
  currencies: CurrencyBreakdown[];
}

interface TransactionVolume {
  month: string;
  transactionCount: number;
  currencies: CurrencyBreakdown[];
  upgrades: number;
  recurring: number;
}

interface ServiceBreakdown {
  service: string;
  totalInvoices: number;
  currencies: CurrencyBreakdown[];
  customerCount: number;
  trend: 'up' | 'down' | 'stable';
}

interface CustomerWorkload {
  customer: string;
  invoiceCount: number;
  currencies: CurrencyBreakdown[];
  activeSubscriptions: number;
  extensionCount: number;
  workloadScore: number;
}

interface ResourceForecast {
  month: string;
  projectedInvoices: number;
  projectedSubscriptions: number;
  projectedExtensions: number;
  capacityUtilization: number;
  recommendation: string;
}

interface ResourceData {
  workloadByMonth: WorkloadItem[];
  capacityMetrics: CapacityMetric[];
  subscriptionTrends: SubscriptionTrend[];
  transactionVolume: TransactionVolume[];
  serviceBreakdown: ServiceBreakdown[];
  customerWorkload: CustomerWorkload[];
  forecasts: ResourceForecast[];
  currencies: string[];
  summary: {
    totalInvoices: number;
    activeSubscriptions: number;
    activeExtensions: number;
    avgCapacityUtilization: number;
  };
}

const TREND_ICONS = {
  up: '↑',
  down: '↓',
  stable: '→',
};

const TREND_COLORS = {
  up: 'text-green-600',
  down: 'text-red-600',
  stable: 'text-gray-500',
};

const UTILIZATION_COLORS = (util: number) => {
  if (util >= 85) return { bg: 'bg-red-100', bar: 'bg-red-500', text: 'text-red-800' };
  if (util >= 70) return { bg: 'bg-amber-100', bar: 'bg-amber-500', text: 'text-amber-800' };
  if (util >= 40) return { bg: 'bg-green-100', bar: 'bg-green-500', text: 'text-green-800' };
  return { bg: 'bg-blue-100', bar: 'bg-blue-500', text: 'text-blue-800' };
};

export default function ResourceCapacity() {
  const [data, setData] = useState<ResourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'customers' | 'forecast'>('overview');
  const [convertToUsd, setConvertToUsd] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_EXCHANGE_RATES);
  const [showRateEditor, setShowRateEditor] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/resource-capacity?months=${months}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch resource capacity:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [months]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Resource & Capacity Planning</h2>
        <p className="text-center py-12 text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Resource & Capacity Planning</h2>
            <p className="text-sm text-slate-500 mt-0.5">Workload, subscriptions, and forecasts</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRateEditor(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Edit rates
            </button>
            <CurrencyConverterToggle enabled={convertToUsd} onToggle={setConvertToUsd} />
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">Period:</label>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total Invoices</p>
            <p className="text-xl font-semibold text-slate-900">{data.summary.totalInvoices}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
            <p className="text-xs font-medium text-purple-600">Active Subs</p>
            <p className="text-xl font-semibold text-purple-700">{data.summary.activeSubscriptions}</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
            <p className="text-xs font-medium text-teal-600">Active Extensions</p>
            <p className="text-xl font-semibold text-teal-700">{data.summary.activeExtensions}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <p className="text-xs font-medium text-amber-600">Avg Utilization</p>
            <p className="text-xl font-semibold text-amber-700">{Math.round(data.summary.avgCapacityUtilization)}%</p>
          </div>
        </div>

        {/* Currency Legend */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-sm text-slate-500">Currencies:</span>
          {data.currencies.map(c => (
            <span key={c} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{c}</span>
          ))}
        </div>
      </div>

      <ExchangeRateModal
        rates={exchangeRates}
        onRatesChange={setExchangeRates}
        currencies={data.currencies}
        open={showRateEditor}
        onClose={() => setShowRateEditor(false)}
      />

      {/* Tabs */}
      <div className="border-b border-slate-100">
        <nav className="flex -mb-px px-6">
          {(['overview', 'services', 'customers', 'forecast'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Workload by Month */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Monthly Workload</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Month</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Service</th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Invoices</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Revenue</th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Customers</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.workloadByMonth.slice(0, 20).map((w, i) => (
                      <tr key={`${w.month}-${w.serviceType}-${i}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{w.month}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{w.serviceType}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-right">{w.invoiceCount}</td>
                        <td className="px-3 py-2 text-sm"><CurrencyBreakdownList currencies={w.currencies} inline convertToUsd={convertToUsd} rates={exchangeRates} /></td>
                        <td className="px-3 py-2 text-sm text-gray-700 text-right">{w.customerCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Capacity Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Extension Capacity</h3>
                <div className="space-y-2">
                  {data.capacityMetrics.slice(0, 6).map((c) => (
                    <div key={c.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{c.month}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600">{c.activeUsers} active</span>
                        <span className="text-amber-600">{c.trialUsers} trials</span>
                        <span className="text-blue-600">{c.newInstalls} new</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Subscription Trends</h3>
                <div className="space-y-2">
                  {data.subscriptionTrends.slice(0, 6).map((s) => (
                    <div key={s.month} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{s.month}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-green-600">{s.active} active</span>
                          <span className="text-red-600">{s.inactive} inactive</span>
                        </div>
                      </div>
                      <CurrencyBreakdownList currencies={s.currencies} inline convertToUsd={convertToUsd} rates={exchangeRates} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.serviceBreakdown.map((s) => (
                <div key={s.service} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{s.service}</h4>
                    <span className={`text-lg font-bold ${TREND_COLORS[s.trend]}`}>
                      {TREND_ICONS[s.trend]}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700">{s.totalInvoices} invoices</p>
                    <CurrencyBreakdownList currencies={s.currencies} convertToUsd={convertToUsd} rates={exchangeRates} />
                    <p className="text-gray-600">{s.customerCount} customers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Workload Distribution</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Customer</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Invoices</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Revenue</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Subscriptions</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Extensions</th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.customerWorkload.map((c) => {
                    const scoreColor = c.workloadScore > 100 ? 'text-red-600' : c.workloadScore > 50 ? 'text-amber-600' : 'text-green-600';
                    return (
                      <tr key={c.customer} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{c.customer}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 text-right">{c.invoiceCount}</td>
                        <td className="px-3 py-2 text-sm"><CurrencyBreakdownList currencies={c.currencies} inline convertToUsd={convertToUsd} rates={exchangeRates} /></td>
                        <td className="px-3 py-2 text-sm text-gray-700 text-right">{c.activeSubscriptions}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 text-right">{c.extensionCount}</td>
                        <td className={`px-3 py-2 text-sm font-bold text-right ${scoreColor}`}>{c.workloadScore}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'forecast' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Capacity Forecast (3 Months)</h3>
            <div className="space-y-4">
              {data.forecasts.map((f) => {
                const colors = UTILIZATION_COLORS(f.capacityUtilization);
                return (
                  <div key={f.month} className={`p-4 border rounded-lg ${colors.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-bold text-gray-900">{f.month}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colors.text}`}>
                        {f.capacityUtilization}% utilized
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Projected Invoices</p>
                        <p className="text-lg font-bold text-gray-900">{f.projectedInvoices}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Projected Subs</p>
                        <p className="text-lg font-bold text-gray-900">{f.projectedSubscriptions}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Projected Extensions</p>
                        <p className="text-lg font-bold text-gray-900">{f.projectedExtensions}</p>
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${colors.bar} transition-all`}
                          style={{ width: `${f.capacityUtilization}%` }}
                        />
                      </div>
                    </div>

                    <p className={`text-sm font-medium ${colors.text}`}>
                      Recommendation: {f.recommendation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
