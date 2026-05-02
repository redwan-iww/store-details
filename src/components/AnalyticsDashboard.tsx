'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const FORECAST_COLOR = '#94A3B8';

type ForecastMethod = 'trend' | 'moving_avg' | 'growth_rate';

interface AnalyticsData {
  monthly: { month: string; type: string; total: number; count: number }[];
  topCustomers: { customer: string; total: number; count: number }[];
  statusBreakdown: { status: string; count: number; total: number }[];
  typeSplit: { type: string; total: number; count: number }[];
  overall: { total: number; count: number };
}

type ForecastScope = 'all' | '12m';

interface AnalyticsDashboardProps {
  data: AnalyticsData | null;
  loading: boolean;
  typeFilter: 'all' | 'service' | 'product';
  onTypeFilterChange: (filter: 'all' | 'service' | 'product') => void;
  forecastMethod: ForecastMethod;
  onForecastMethodChange: (method: ForecastMethod) => void;
  forecastScope: ForecastScope;
  onForecastScopeChange: (scope: ForecastScope) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMonth = (month: string) => {
  const [year, m] = month.split('-');
  return new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
};

const METHOD_LABELS: Record<ForecastMethod, string> = {
  trend: 'Trend',
  moving_avg: 'Moving Avg',
  growth_rate: 'Growth Rate',
};

const METHOD_DESCRIPTIONS: Record<ForecastMethod, string> = {
  trend: 'Line of best fit over the period — captures momentum but ignores seasonality',
  moving_avg: '12-month rolling average — smooths out noise, shows current run rate',
  growth_rate: 'Year-over-Year growth applied forward — best for baseline projection',
};

export default function AnalyticsDashboard({
  data,
  loading,
  typeFilter,
  onTypeFilterChange,
  forecastMethod,
  onForecastMethodChange,
  forecastScope,
  onForecastScopeChange,
}: AnalyticsDashboardProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const router = useRouter();

  const monthlyChartData = data?.monthly.reduce((acc: Record<string, unknown>[], row) => {
    const existing = acc.find((r) => r.month === row.month);
    const isForecast = row.type === 'forecast';
    if (existing) {
      if (isForecast) {
        existing.forecastTotal = (existing.forecastTotal as number || 0) + row.total;
      } else {
        existing[row.type] = row.total;
        existing[`${row.type}Count`] = row.count;
      }
    } else {
      const entry: Record<string, unknown> = {
        month: row.month,
        monthLabel: formatMonth(row.month),
        isForecast,
      };
      if (isForecast) {
        entry.forecastTotal = row.total;
      } else {
        entry[row.type] = row.total;
        entry[`${row.type}Count`] = row.count;
      }
      acc.push(entry);
    }
    return acc;
  }, []);

  const pieData = data?.typeSplit.map((t) => ({
    name: t.type.charAt(0).toUpperCase() + t.type.slice(1),
    value: t.total,
    count: t.count,
  }));

  const statusPieData = data?.statusBreakdown.map((s) => ({
    name: s.status || 'Unknown',
    value: s.count,
    total: s.total,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">No data available</div>;
  }

  return (
    <>
      {/* Type Filter */}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-800">Filter by type:</span>
        <div className="flex rounded overflow-hidden border border-gray-300">
          {(['all', 'service', 'product'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onTypeFilterChange(t)}
              className={`px-4 py-2 capitalize font-medium text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.overall.total)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Total Records</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.overall.count.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Avg per Record</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(data.overall.total / (data.overall.count || 1))}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Months of Data</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.monthly.length}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue Trend</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Data:</span>
                <div className="flex rounded overflow-hidden border border-gray-300">
                  {(['all', '12m'] as ForecastScope[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => onForecastScopeChange(s)}
                      className={`px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 ${
                        forecastScope === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s === 'all' ? 'All Time' : 'Last 12M'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Method:</span>
                <div className="flex rounded overflow-hidden border border-gray-300">
                  {(['trend', 'moving_avg', 'growth_rate'] as ForecastMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => onForecastMethodChange(m)}
                      className={`px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 ${
                        forecastMethod === m ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                {typeFilter === 'all' && (
                  <>
                    <Bar dataKey="service" name="Service" fill="#3B82F6" stackId="a" />
                    <Bar dataKey="product" name="Product" fill="#10B981" stackId="a" />
                    <Bar dataKey="forecastTotal" name="Forecast" fill={FORECAST_COLOR} stackId="a" />
                  </>
                )}
                {typeFilter !== 'all' && (
                  <>
                    <Bar dataKey={typeFilter} name={typeFilter} fill="#3B82F6" />
                    <Bar dataKey="forecastTotal" name="Forecast" fill={FORECAST_COLOR} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Method explanations */}
          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 space-y-1">
            <p className="text-xs font-semibold text-gray-700">Forecast Methods:</p>
            <p className="text-xs text-gray-600"><span className="font-medium">Trend:</span> {METHOD_DESCRIPTIONS.trend}</p>
            <p className="text-xs text-gray-600"><span className="font-medium">Moving Avg:</span> {METHOD_DESCRIPTIONS.moving_avg}</p>
            <p className="text-xs text-gray-600"><span className="font-medium">Growth Rate:</span> {METHOD_DESCRIPTIONS.growth_rate}</p>
          </div>
          <p className="text-xs text-gray-400 mt-2">Gray bars = 12-month forecast ({METHOD_LABELS[forecastMethod]})</p>
        </div>

        {/* Service vs Product Split */}
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {pieData?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            {pieData?.map((item, index) => (
              <div key={item.name} className="flex items-center justify-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-700">{item.name}:</span>
                <span className="font-medium text-gray-900">{formatCurrency(item.value)}</span>
                <span className="text-gray-500">({item.count} records)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.topCustomers.map((c, i) => {
              const pct = (c.total / data.overall.total) * 100;
              return (
                <div key={c.customer} className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-all">
                  <button
                    onClick={() => setSelectedCustomer(selectedCustomer === c.customer ? null : c.customer)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-lg font-bold text-gray-400">#{i + 1}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(c.total)}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate mb-1" title={c.customer}>
                      {c.customer}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{pct.toFixed(1)}% of total</span>
                      <span>{c.count} records</span>
                    </div>
                    <div className="mt-2 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </button>
                  {selectedCustomer === c.customer && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <a
                        href={`/data?type=all&customer=${encodeURIComponent(c.customer)}`}
                        className="block text-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 mb-2"
                      >
                        View in Data Page
                      </a>
                      <p className="text-xs text-gray-500 text-center">
                        {c.count} transactions totaling {formatCurrency(c.total)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.statusBreakdown.map((s, i) => {
              const pct = (s.count / data.overall.count) * 100;
              const statusKey = s.status || 'Unknown';
              return (
                <div key={s.status} className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-all">
                  <button
                    onClick={() => setSelectedStatus(selectedStatus === statusKey ? null : statusKey)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {s.status || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{s.count.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(s.total)}</p>
                    <p className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}%</p>
                  </button>
                  {selectedStatus === statusKey && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <a
                        href={`/data?type=all&status=${encodeURIComponent(s.status || '')}`}
                        className="block text-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 mb-2"
                      >
                        View in Data Page
                      </a>
                      <p className="text-xs text-gray-500 text-center">
                        {s.count} transactions totaling {formatCurrency(s.total)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}