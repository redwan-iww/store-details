'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label,
} from 'recharts';

interface ChurnMetricsData {
  summary: {
    uninstalls: number;
    paymentFailures: number;
    purchases: number;
    installs: number;
    cancellations: number;
    cancelsAfterFailure: number;
  };
  uninstalls: {
    monthly: [string, number][];
    yearly: [string, number][];
    byExtension: [string, number][];
    byExtensionMonthly: Record<string, Record<string, number>>;
    byExtensionYearly: Record<string, Record<string, number>>;
  };
  paymentFailures: {
    monthly: [string, number][];
    yearly: [string, number][];
    byExtension: [string, number][];
    byExtensionMonthly: Record<string, Record<string, number>>;
    byExtensionYearly: Record<string, Record<string, number>>;
  };
  purchases: {
    monthly: [string, number][];
    yearly: [string, number][];
    byExtension: [string, number][];
    byExtensionMonthly: Record<string, Record<string, number>>;
    byExtensionYearly: Record<string, Record<string, number>>;
  };
  installs: {
    monthly: [string, number][];
    yearly: [string, number][];
    byExtension: [string, number][];
    byExtensionMonthly: Record<string, Record<string, number>>;
    byExtensionYearly: Record<string, Record<string, number>>;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatMonth = (month: string) => {
  if (!month || month.length < 7) return month;
  const [y, m] = month.split('-');
  const monthIdx = parseInt(m) - 1;
  return `${MONTH_NAMES[monthIdx]} ${y.slice(2)}`;
};

// Simplify extension names for better readability
const simplifyExtName = (name: string): string => {
  return name
    .replace(/For ZOHO CRM/gi, '')
    .replace(/For Zoho CRM/gi, '')
    .replace(/for ZOHO CRM/gi, '')
    .replace(/for Zoho CRM/gi, '')
    .replace(/ZOHO CRM/gi, '')
    .replace(/Zoho CRM/gi, '')
    .replace(/^Easy/i, '')
    .trim();
};

export default function ChurnMetrics() {
  const [data, setData] = useState<ChurnMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExtension, setSelectedExtension] = useState<string>('');
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'extension' | 'extensionDetail'>('monthly');
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'uninstalls' | 'paymentFailures' | 'purchases' | 'installs'>('all');
  const [extensionMetric, setExtensionMetric] = useState<'all' | 'uninstalls' | 'paymentFailures' | 'purchases' | 'installs'>('all');
  const [extensionViewMode, setExtensionViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [extensionYear, setExtensionYear] = useState<number>(2026);
  const [showProjection, setShowProjection] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/churn-metrics')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
        const years = [...new Set([
          ...d.uninstalls.yearly.map(([y]: [string, number]) => parseInt(y)),
          ...d.paymentFailures.yearly.map(([y]: [string, number]) => parseInt(y)),
          ...d.purchases.yearly.map(([y]: [string, number]) => parseInt(y)),
          ...d.installs.yearly.map(([y]: [string, number]) => parseInt(y)),
        ])].sort((a, b) => b - a);
        const currentYear = 2026;
        const initialYear = years.includes(currentYear) ? currentYear : (years[0] || currentYear);
        setSelectedYear(initialYear);
        setExtensionYear(initialYear);
      })
      .catch(() => setLoading(false));
  }, []);

  const prepareChartData = (metric: keyof ChurnMetricsData | 'all', year: number) => {
    if (!data) return null;
    const CURRENT_MONTH = 6;
    const CURRENT_YEAR = 2026;
    const currentMonth = CURRENT_MONTH;
    const isCurrentYear = year === CURRENT_YEAR;

    const availableYears = [...new Set([
      ...data.uninstalls.yearly.map(([y]) => parseInt(y)),
      ...data.paymentFailures.yearly.map(([y]) => parseInt(y)),
      ...data.purchases.yearly.map(([y]) => parseInt(y)),
      ...data.installs.yearly.map(([y]) => parseInt(y)),
    ])].sort((a, b) => b - a);

    const firstInstallMonth = data.installs.monthly.find(([m, v]) => v > 0)?.[0] || '';
    const [firstInstallYear] = firstInstallMonth.split('-').map(Number);
    const minYear = firstInstallYear || availableYears[availableYears.length - 1] || 2025;
    const maxYear = availableYears[0] || 2026;
    const firstInstallMonthNum = firstInstallMonth ? parseInt(firstInstallMonth.split('-')[1]) : 1;

    const calcAverage = (d: [string, number][]) => {
      const yearData = d.filter(([m]) => m.startsWith(year.toString()) && parseInt(m.split('-')[1]) < currentMonth);
      if (yearData.length === 0) return 0;
      const sum = yearData.reduce((acc, [, v]) => acc + v, 0);
      return Math.round(sum / yearData.length);
    };

    const avgUninstalls = calcAverage(data.uninstalls.monthly);
    const avgFailures = calcAverage(data.paymentFailures.monthly);
    const avgPurchases = calcAverage(data.purchases.monthly);
    const avgInstalls = calcAverage(data.installs.monthly);

    if (viewMode === 'monthly') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      return monthNames.map((monthName, index) => {
        const monthNum = index + 1;
        const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
        const isBeforeFirstInstall = year < firstInstallYear || (year === firstInstallYear && monthNum < firstInstallMonthNum);
        const u = data.uninstalls.monthly.find(([m]) => m === monthStr)?.[1] || 0;
        const p = data.paymentFailures.monthly.find(([m]) => m === monthStr)?.[1] || 0;
        const pu = data.purchases.monthly.find(([m]) => m === monthStr)?.[1] || 0;
        const i = data.installs.monthly.find(([m]) => m === monthStr)?.[1] || 0;
        return {
          name: monthName,
          fullName: `${fullMonthNames[index]} ${year}`,
          monthNum,
          year,
          uninstalls: isBeforeFirstInstall ? null : u,
          paymentFailures: isBeforeFirstInstall ? null : p,
          purchases: isBeforeFirstInstall ? null : pu,
          installs: isBeforeFirstInstall ? null : i,
        };
      });
    } else if (viewMode === 'yearly') {
      const years: string[] = [];
      for (let y = minYear; y <= maxYear; y++) years.push(y.toString());
      return years.map(yearStr => {
        const yearNum = parseInt(yearStr);
        const isBeforeFirstInstall = yearNum < firstInstallYear;
        return {
          name: yearStr,
          uninstalls: isBeforeFirstInstall ? null : data.uninstalls.yearly.find(([y]) => y === yearStr)?.[1] || 0,
          paymentFailures: isBeforeFirstInstall ? null : data.paymentFailures.yearly.find(([y]) => y === yearStr)?.[1] || 0,
          purchases: isBeforeFirstInstall ? null : data.purchases.yearly.find(([y]) => y === yearStr)?.[1] || 0,
          installs: isBeforeFirstInstall ? null : data.installs.yearly.find(([y]) => y === yearStr)?.[1] || 0,
        };
      });
    } else if (viewMode === 'extension') {
      const allExts = new Set([
        ...data.uninstalls.byExtension.map(([e]) => e),
        ...data.paymentFailures.byExtension.map(([e]) => e),
        ...data.purchases.byExtension.map(([e]) => e),
        ...data.installs.byExtension.map(([e]) => e),
      ]);
      return [...allExts].slice(0, 10).map(ext => ({
        name: ext.length > 25 ? ext.substring(0, 25) + '...' : ext,
        uninstalls: data.uninstalls.byExtension.find(([e]) => e === ext)?.[1] || 0,
        paymentFailures: data.paymentFailures.byExtension.find(([e]) => e === ext)?.[1] || 0,
        purchases: data.purchases.byExtension.find(([e]) => e === ext)?.[1] || 0,
        installs: data.installs.byExtension.find(([e]) => e === ext)?.[1] || 0,
      }));
    } else {
      const topExts = [...data.installs.byExtension].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ext]) => ext);
      const extNameMap: Record<string, string> = {};
      topExts.forEach(ext => { extNameMap[ext] = simplifyExtName(ext); });
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const makeData = (source: Record<string, Record<string, number>>) => monthNames.map((monthName, index) => {
        const monthNum = index + 1;
        const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
        const isBeforeFirstInstall = year < firstInstallYear || (year === firstInstallYear && monthNum < firstInstallMonthNum);
        const result: any = { name: monthName, fullName: `${monthName} ${year}` };
        topExts.forEach(ext => {
          result[extNameMap[ext]] = isBeforeFirstInstall ? null : (source[ext]?.[monthStr] || 0);
        });
        return result;
      });

      return {
        installsData: makeData(data.installs.byExtensionMonthly),
        purchasesData: makeData(data.purchases.byExtensionMonthly),
        uninstallsData: makeData(data.uninstalls.byExtensionMonthly),
        failuresData: makeData(data.paymentFailures.byExtensionMonthly || {}),
        topExts,
        extNameMap,
      };
    }
  };

  const chartData = useMemo(() => prepareChartData(selectedMetric, selectedYear), [selectedMetric, selectedYear, data, viewMode]) as any;

  const extensionChartData = useMemo(() => {
    if (!data || !selectedExtension) return [];
    if (extensionViewMode === 'yearly') {
      const availableYears = [...new Set([
        ...Object.keys(data.installs.byExtensionYearly[selectedExtension] || {}),
        ...Object.keys(data.purchases.byExtensionYearly[selectedExtension] || {}),
        ...Object.keys(data.uninstalls.byExtensionYearly[selectedExtension] || {}),
      ])].sort();
      return availableYears.map(yearStr => ({
        name: yearStr,
        installs: data.installs.byExtensionYearly[selectedExtension]?.[yearStr] || 0,
        purchases: data.purchases.byExtensionYearly[selectedExtension]?.[yearStr] || 0,
        uninstalls: data.uninstalls.byExtensionYearly[selectedExtension]?.[yearStr] || 0,
        paymentFailures: data.paymentFailures.byExtensionYearly?.[selectedExtension]?.[yearStr] || 0,
      }));
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const firstInstallMonth = data.installs.monthly.find(([m, v]) => v > 0)?.[0] || '';
    const [firstInstallYear] = firstInstallMonth.split('-').map(Number);
    const firstInstallMonthNum = firstInstallMonth ? parseInt(firstInstallMonth.split('-')[1]) : 1;
    return monthNames.map((monthName, index) => {
      const monthNum = index + 1;
      const monthStr = `${extensionYear}-${String(monthNum).padStart(2, '0')}`;
      const isBeforeFirstInstall = extensionYear < firstInstallYear || (extensionYear === firstInstallYear && monthNum < firstInstallMonthNum);
      return {
        name: monthName,
        installs: isBeforeFirstInstall ? null : (data.installs.byExtensionMonthly[selectedExtension]?.[monthStr] || 0),
        purchases: isBeforeFirstInstall ? null : (data.purchases.byExtensionMonthly[selectedExtension]?.[monthStr] || 0),
        uninstalls: isBeforeFirstInstall ? null : (data.uninstalls.byExtensionMonthly[selectedExtension]?.[monthStr] || 0),
        paymentFailures: isBeforeFirstInstall ? null : (data.paymentFailures.byExtensionMonthly?.[selectedExtension]?.[monthStr] || 0),
      };
    });
  }, [data, selectedExtension, extensionYear, extensionViewMode]);

  const extensionFallbackData = useMemo(() => {
    if (!data) return [];
    if (extensionViewMode === 'yearly') {
      const availableYears = [...new Set([
        ...data.uninstalls.yearly.map(([y]) => y),
        ...data.purchases.yearly.map(([y]) => y),
        ...data.installs.yearly.map(([y]) => y),
      ])].sort();
      return availableYears.map(yearStr => ({
        name: yearStr,
        installs: (data.installs.yearly.find(([y]) => y === yearStr)?.[1] || 0) as number | null,
        purchases: (data.purchases.yearly.find(([y]) => y === yearStr)?.[1] || 0) as number | null,
        uninstalls: (data.uninstalls.yearly.find(([y]) => y === yearStr)?.[1] || 0) as number | null,
        paymentFailures: (data.paymentFailures.yearly.find(([y]) => y === yearStr)?.[1] || 0) as number | null,
      }));
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const firstInstallMonth = data.installs.monthly.find(([m, v]) => v > 0)?.[0] || '';
    const [firstInstallYear] = firstInstallMonth.split('-').map(Number);
    const firstInstallMonthNum = firstInstallMonth ? parseInt(firstInstallMonth.split('-')[1]) : 1;
    return monthNames.map((monthName, index) => {
      const monthNum = index + 1;
      const monthStr = `${extensionYear}-${String(monthNum).padStart(2, '0')}`;
      const isBeforeFirstInstall = extensionYear < firstInstallYear || (extensionYear === firstInstallYear && monthNum < firstInstallMonthNum);
      return {
        name: monthName,
        fullName: `${monthName} ${extensionYear}`,
        monthNum,
        year: extensionYear,
        installs: isBeforeFirstInstall ? null : (data.installs.monthly.find(([m]) => m === monthStr)?.[1] || 0),
        purchases: isBeforeFirstInstall ? null : (data.purchases.monthly.find(([m]) => m === monthStr)?.[1] || 0),
        uninstalls: isBeforeFirstInstall ? null : (data.uninstalls.monthly.find(([m]) => m === monthStr)?.[1] || 0),
        paymentFailures: isBeforeFirstInstall ? null : (data.paymentFailures.monthly.find(([m]) => m === monthStr)?.[1] || 0),
      };
    });
  }, [data, extensionYear, extensionViewMode]);
  const isCurrentYear = selectedYear === 2026;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">No churn metrics available</div>;
  }

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-5 border border-gray-200 h-24 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="h-80 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const availableYears = [...new Set([
    ...data.uninstalls.yearly.map(([y]) => parseInt(y)),
    ...data.paymentFailures.yearly.map(([y]) => parseInt(y)),
    ...data.purchases.yearly.map(([y]) => parseInt(y)),
    ...data.installs.yearly.map(([y]) => parseInt(y)),
  ])].sort((a, b) => b - a);

  const firstInstallMonth = data.installs.monthly.find(([m, v]) => v > 0)?.[0] || '';
  const [firstInstallYear] = firstInstallMonth.split('-').map(Number);
  const minYear = firstInstallYear || availableYears[availableYears.length - 1] || 2025;
  const maxYear = availableYears[0] || 2026;

  const metricColors = {
    uninstalls: '#EF4444',
    paymentFailures: '#F59E0B',
    purchases: '#10B981',
    installs: '#3B82F6',
  };

  const metricLabels = {
    uninstalls: 'Uninstalls',
    paymentFailures: 'Payment Failures',
    purchases: 'Purchases',
    installs: 'Installs',
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-5 border border-blue-200">
          <h3 className="text-sm font-medium text-gray-600">Total Installs</h3>
          <p className="text-2xl font-bold text-blue-600 mt-1">{data.summary.installs.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">All extension installations</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border border-green-200">
          <h3 className="text-sm font-medium text-gray-600">Total Purchases</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">{data.summary.purchases.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Purchased? = true</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border border-red-200">
          <h3 className="text-sm font-medium text-gray-600">Total Uninstalls</h3>
          <p className="text-2xl font-bold text-red-600 mt-1">{data.summary.uninstalls.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Status: Uninstall/Uninstalled</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border border-amber-200">
          <h3 className="text-sm font-medium text-gray-600">Payment Failures</h3>
          <p className="text-2xl font-bold text-amber-600 mt-1">{data.summary.paymentFailures.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">recurring_failure transactions</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Cancellations after Failure</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.cancelsAfterFailure}</p>
          <p className="text-xs text-gray-500 mt-1">{((data.summary.cancelsAfterFailure / data.summary.cancellations) * 100).toFixed(1)}% of cancels</p>
        </div>
      </div>

      {/* Controls and Chart */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Metric:</span>
              <div className="flex rounded overflow-hidden border border-gray-300">
                {(['all', 'uninstalls', 'paymentFailures', 'purchases', 'installs'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMetric(m)}
                    className={`px-3 py-1.5 capitalize font-medium text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                      selectedMetric === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {m === 'all' ? 'All Metrics' : m === 'paymentFailures' ? 'Payment Failures' : m === 'uninstalls' ? 'Uninstalls' : m === 'installs' ? 'Installs' : 'Purchases'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">View:</span>
              <div className="flex rounded overflow-hidden border border-gray-300">
                {(['monthly', 'yearly'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={`px-3 py-1.5 capitalize font-medium text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                      viewMode === v ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {(viewMode === 'monthly' || viewMode === 'yearly') && (
              <>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-300">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm font-bold text-gray-800">Year:</span>
                    <span className="text-xs text-gray-500">{minYear} - {maxYear}</span>
                  </div>
                  <button
                    onClick={() => setSelectedYear(y => Math.max(minYear, y - 1))}
                    disabled={selectedYear <= minYear}
                    className={`px-4 py-2 text-sm font-bold rounded-lg border-2 shadow-sm transition-all ${
                      selectedYear <= minYear 
                        ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed' 
                        : 'bg-blue-100 text-blue-800 border-blue-400 hover:bg-blue-200 hover:border-blue-500'
                    }`}
                    title={selectedYear <= minYear ? `Earliest year available: ${minYear}` : `Go to ${selectedYear - 1}`}
                  >
                    ◀ Prev
                  </button>
                  <span className="text-lg font-bold text-white px-4 py-2 bg-blue-600 rounded-lg min-w-[100px] text-center shadow-md">{selectedYear}</span>
                  <button
                    onClick={() => setSelectedYear(y => Math.min(maxYear, y + 1))}
                    disabled={selectedYear >= maxYear}
                    className={`px-4 py-2 text-sm font-bold rounded-lg border-2 shadow-sm transition-all ${
                      selectedYear >= maxYear 
                        ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed' 
                        : 'bg-blue-100 text-blue-800 border-blue-400 hover:bg-blue-200 hover:border-blue-500'
                    }`}
                    title={selectedYear >= maxYear ? `Latest year available: ${maxYear}` : `Go to ${selectedYear + 1}`}
                  >
                    Next ▶
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {viewMode === 'extensionDetail' 
                ? 'Extension Details'
                : selectedMetric === 'all' 
                  ? 'All Metrics Comparison' 
                  : `${metricLabels[selectedMetric]} - ${
                      viewMode === 'monthly' 
                        ? `Monthly View (${selectedYear})` 
                        : 'By Year'
                    }`
              }
              {viewMode === 'monthly' && <span className="text-sm font-normal text-gray-500 ml-2">(Line starts from first install date)</span>}
            </h3>
          </div>
          <div className="h-80">
          {!mounted || viewMode === 'extensionDetail' ? (
            <div className="h-full bg-gray-100 rounded animate-pulse" />
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={Array.isArray(chartData) ? chartData : []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" domain={[0, 100]} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length > 0) {
                    const monthNum = (payload[0].payload as any)?.monthNum;
                    const monthName = monthNum ? `${FULL_MONTH_NAMES[monthNum - 1]} ${selectedYear}` : label;
                    return (
                      <div className="bg-white border border-gray-300 shadow-lg rounded px-3 py-2 text-sm">
                        <p className="font-semibold text-gray-900">{monthName}</p>
                        {selectedMetric === 'all' ? (
                          <>
                            <p className="text-blue-600">Installs: <span className="font-medium">{(payload.find((p: any) => p.dataKey === 'installs')?.value)}</span></p>
                            <p className="text-green-600">Purchases: <span className="font-medium">{(payload.find((p: any) => p.dataKey === 'purchases')?.value)}</span></p>
                            <p className="text-red-600">Uninstalls: <span className="font-medium">{(payload.find((p: any) => p.dataKey === 'uninstalls')?.value)}</span></p>
                            <p className="text-amber-600">Payment Failures: <span className="font-medium">{(payload.find((p: any) => p.dataKey === 'paymentFailures')?.value)}</span></p>
                          </>
                        ) : (
                          <p className="text-gray-600">{payload[0].name}: <span className="font-medium">{payload[0].value}</span></p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {selectedMetric === 'all' ? (
                <>
                  <Line type="monotone" dataKey="installs" name="Installs" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="purchases" name="Purchases" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="uninstalls" name="Uninstalls" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="paymentFailures" name="Payment Failures" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} connectNulls={false} />
                </>
              ) : (
                <Line type="monotone" dataKey={selectedMetric} name={metricLabels[selectedMetric]} stroke={metricColors[selectedMetric]} strokeWidth={2} dot={{ fill: metricColors[selectedMetric], r: 3 }} connectNulls={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Insight Cards */}
        {selectedMetric === 'all' && viewMode !== 'extensionDetail' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">🔵 Install Insight</h4>
              <p className="text-sm text-blue-700">
                {data.installs.byExtension[0]?.[0] || 'Workdrive'} is the most installed extension with{' '}
                {data.installs.byExtension[0]?.[1] || 0} installs.
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">🟢 Purchase Insight</h4>
              <p className="text-sm text-green-700">
                {data.summary.purchases} total purchases. Conversion rate:{' '}
                {((data.summary.purchases / (data.summary.purchases + data.summary.uninstalls)) * 100).toFixed(1)}%.
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">🔴 Uninstall Insight</h4>
              <p className="text-sm text-red-700">
                {data.uninstalls.byExtension[0]?.[0] || 'Workdrive'} accounts for{' '}
                {Math.round(((data.uninstalls.byExtension[0]?.[1] || 0) / data.summary.uninstalls) * 100)}% of uninstalls.
                Focus retention efforts here.
              </p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">🟡 Payment Failure Insight</h4>
              <p className="text-sm text-amber-700">
                Only {data.summary.cancelsAfterFailure} cancellations followed payment failures.
                Most churn is voluntary, not payment-related.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Extension Analysis Section - Completely Separate */}
      <div className="bg-white rounded-lg shadow border border-purple-200">
        <div className="p-4 border-b border-purple-200 bg-purple-50">
          <div className="flex flex-wrap items-center gap-4">
            <h3 className="text-lg font-semibold text-purple-900">Extension Analysis</h3>
            <div className="flex items-center gap-2 pl-4 border-l border-purple-300">
              <span className="text-sm font-semibold text-purple-800">Extension:</span>
              <select
                value={selectedExtension}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedExtension(e.target.value);
                    setExtensionMetric('all');
                  } else {
                    setSelectedExtension('');
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium border border-purple-300 rounded bg-white text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select extension...</option>
                {data && [...new Set([
                  ...data.installs.byExtension.map(([e]) => e),
                ])].sort().map(ext => (
                  <option key={ext} value={ext}>{ext}</option>
                ))}
              </select>
            </div>
            {selectedExtension && (
              <button
                onClick={() => { setSelectedExtension(''); setExtensionMetric('all'); setExtensionViewMode('monthly'); setExtensionYear(2026); }}
                className="px-2 py-1.5 text-sm text-purple-600 hover:text-purple-800"
                title="Clear selection"
              >
                ✕
              </button>
            )}
            <div className="flex items-center gap-2 pl-4 border-l border-purple-300">
              <span className="text-sm font-semibold text-purple-800">View:</span>
              <div className="flex rounded-lg overflow-hidden border border-purple-300">
                {(['monthly', 'yearly'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setExtensionViewMode(v)}
                    className={`px-3 py-1.5 capitalize font-medium text-sm transition-colors ${
                      extensionViewMode === v ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pl-4 border-l border-purple-300">
              <span className="text-sm font-semibold text-purple-800">Metric:</span>
              <div className="flex rounded-lg overflow-hidden border border-purple-300">
                {(['all', 'uninstalls', 'paymentFailures', 'purchases', 'installs'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setExtensionMetric(m)}
                    className={`px-3 py-1.5 capitalize font-medium text-sm transition-colors ${
                      extensionMetric === m ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    {m === 'all' ? 'All' : m === 'paymentFailures' ? 'Failures' : m === 'uninstalls' ? 'Uninstalls' : m === 'installs' ? 'Installs' : 'Purchases'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pl-4 border-l border-purple-300">
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-bold text-purple-800">Year:</span>
                <span className="text-xs text-purple-500">{minYear} - {maxYear}</span>
              </div>
              <button
                onClick={() => setExtensionYear(y => Math.max(minYear, y - 1))}
                disabled={extensionYear <= minYear}
                className={`px-3 py-1.5 text-sm font-bold rounded-lg border transition-all ${
                  extensionYear <= minYear 
                    ? 'bg-purple-100 text-purple-300 border-purple-200 cursor-not-allowed' 
                    : 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                }`}
              >
                ◀ Prev
              </button>
              <span className="text-base font-bold text-white px-3 py-1 bg-purple-600 rounded-lg min-w-[80px] text-center shadow-sm">{extensionYear}</span>
              <button
                onClick={() => setExtensionYear(y => Math.min(maxYear, y + 1))}
                disabled={extensionYear >= maxYear}
                className={`px-3 py-1.5 text-sm font-bold rounded-lg border transition-all ${
                  extensionYear >= maxYear 
                    ? 'bg-purple-100 text-purple-300 border-purple-200 cursor-not-allowed' 
                    : 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                }`}
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-5">
          {selectedExtension ? (
            <div>
              <div className="flex flex-wrap items-center gap-3 text-sm mb-4 bg-purple-50 rounded-lg px-4 py-3 border border-purple-200">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span><span className="text-blue-600">Installs:</span> <strong className="text-blue-700">{data?.installs.byExtension.find(([e]) => e === selectedExtension)?.[1] || 0}</strong></span>
                <span className="h-5 w-px bg-gray-300"></span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span><span className="text-green-600">Purchases:</span> <strong className="text-green-700">{data?.purchases.byExtension.find(([e]) => e === selectedExtension)?.[1] || 0}</strong></span>
                <span className="h-5 w-px bg-gray-300"></span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span><span className="text-red-600">Uninstalls:</span> <strong className="text-red-700">{data?.uninstalls.byExtension.find(([e]) => e === selectedExtension)?.[1] || 0}</strong></span>
                <span className="h-5 w-px bg-gray-300"></span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span className="text-amber-600">Failures:</span> <strong className="text-amber-700">{data?.paymentFailures.byExtension.find(([e]) => e === selectedExtension)?.[1] || 0}</strong></span>
              </div>
              <div className="h-80">
                {!mounted ? (
                  <div className="h-full bg-gray-100 rounded animate-pulse" />
                ) : extensionViewMode === 'yearly' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={extensionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    {(extensionMetric === 'all' || extensionMetric === 'installs') && (
                      <Bar dataKey="installs" name="Installs" fill="#3B82F6" />
                    )}
                    {(extensionMetric === 'all' || extensionMetric === 'purchases') && (
                      <Bar dataKey="purchases" name="Purchases" fill="#10B981" />
                    )}
                    {(extensionMetric === 'all' || extensionMetric === 'uninstalls') && (
                      <Bar dataKey="uninstalls" name="Uninstalls" fill="#EF4444" />
                    )}
                    {(extensionMetric === 'all' || extensionMetric === 'paymentFailures') && (
                      <Bar dataKey="paymentFailures" name="Payment Failures" fill="#F59E0B" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={extensionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    {(extensionMetric === 'all' || extensionMetric === 'installs') && (
                      <Bar dataKey="installs" name="Installs" fill="#3B82F6" />
                    )}
                    {(extensionMetric === 'all' || extensionMetric === 'purchases') && (
                      <Bar dataKey="purchases" name="Purchases" fill="#10B981" />
                    )}
                    {(extensionMetric === 'all' || extensionMetric === 'uninstalls') && (
                      <Bar dataKey="uninstalls" name="Uninstalls" fill="#EF4444" />
                    )}
                    {(extensionMetric === 'all' || extensionMetric === 'paymentFailures') && (
                      <Bar dataKey="paymentFailures" name="Payment Failures" fill="#F59E0B" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
          ) : (
            <div className="h-80">
              {!mounted ? (
                <div className="h-full bg-gray-100 rounded animate-pulse" />
              ) : extensionViewMode === 'yearly' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={extensionFallbackData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" domain={[0, 100]} />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="installs" name="Installs" fill="#3B82F6" />
                  <Bar dataKey="purchases" name="Purchases" fill="#10B981" />
                  <Bar dataKey="uninstalls" name="Uninstalls" fill="#EF4444" />
                  <Bar dataKey="paymentFailures" name="Payment Failures" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={extensionFallbackData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" domain={[0, 100]} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length > 0) {
                        const monthNum = (payload[0].payload as any)?.monthNum;
                        const monthName = monthNum ? `${FULL_MONTH_NAMES[monthNum - 1]} ${extensionYear}` : label;
                        return (
                          <div className="bg-white border border-gray-300 shadow-lg rounded px-3 py-2 text-sm">
                            <p className="font-semibold text-gray-900">{monthName}</p>
                            <p className="text-blue-600">Installs: <span className="font-medium">{(payload.find((p: any) => p.dataKey === 'installs')?.value)}</span></p>
                            <p className="text-green-600">Purchases: <span className="font-medium">{(payload.find((p: any) => p.dataKey === 'purchases')?.value)}</span></p>
                            <p className="text-red-600">Uninstalls: <span className="font-medium">{(payload.find((p: any) => p.dataKey === 'uninstalls')?.value)}</span></p>
                            <p className="text-amber-600">Payment Failures: <span className="font-medium">{(payload.find((p: any) => p.dataKey === 'paymentFailures')?.value)}</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="installs" name="Installs" fill="#3B82F6" />
                  <Bar dataKey="purchases" name="Purchases" fill="#10B981" />
                  <Bar dataKey="uninstalls" name="Uninstalls" fill="#EF4444" />
                  <Bar dataKey="paymentFailures" name="Payment Failures" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
