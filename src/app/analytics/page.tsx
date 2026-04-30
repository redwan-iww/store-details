'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

interface AnalyticsData {
  monthly: { month: string; type: string; total: number; count: number }[];
  topCustomers: { customer: string; total: number; count: number }[];
  statusBreakdown: { status: string; count: number; total: number }[];
  typeSplit: { type: string; total: number; count: number }[];
  overall: { total: number; count: number };
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

  // Prepare monthly chart data - stack service and product
  const monthlyChartData = data?.monthly.reduce((acc: Record<string, any>[], row) => {
    const existing = acc.find((r) => r.month === row.month);
    if (existing) {
      existing[row.type] = row.total;
      existing[`${row.type}Count`] = row.count;
    } else {
      acc.push({
        month: row.month,
        monthLabel: formatMonth(row.month),
        [row.type]: row.total,
        [`${row.type}Count`]: row.count,
      });
    }
    return acc;
  }, []);

  // Pie chart data for type split
  const pieData = data?.typeSplit.map((t) => ({
    name: t.type.charAt(0).toUpperCase() + t.type.slice(1),
    value: t.total,
    count: t.count,
  }));

  // Status pie data
  const statusPieData = data?.statusBreakdown.map((s) => ({
    name: s.status || 'Unknown',
    value: s.count,
    total: s.total,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-600 mt-0.5">Revenue and usage insights</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            ← Back to Data
          </Link>
        </div>
      </header>

      <main className="p-6">
        {/* Type Filter */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-800">Filter by type:</span>
          <div className="flex rounded overflow-hidden border border-gray-300">
            {(['all', 'service', 'product'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-2 capitalize font-medium text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                  typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : data ? (
          <>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
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
                        </>
                      )}
                      {typeFilter !== 'all' && (
                        <Bar dataKey={typeFilter} name={typeFilter} fill="#3B82F6" />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Revenue</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topCustomers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6B7280" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="customer" tick={{ fontSize: 11 }} stroke="#6B7280" width={120} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="total" name="Revenue" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Records by Status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {statusPieData?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, _name, props) => [`${value} records`, (props.payload as any).name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">No data available</div>
        )}
      </main>
    </div>
  );
}