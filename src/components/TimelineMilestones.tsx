'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';

interface Milestone {
  id: string;
  date: string;
  type: 'invoice' | 'subscription' | 'transaction' | 'extension';
  recordType: 'service' | 'product';
  category: 'payment_due' | 'payment_received' | 'renewal' | 'upgrade' | 'install' | 'expiry' | 'reactivation' | 'commission';
  customer: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: 'upcoming' | 'completed' | 'overdue' | 'at_risk';
  source: string;
}

interface TimelineSummary {
  total: number;
  upcoming: number;
  overdue: number;
  at_risk: number;
  completed: number;
  totalAmount: number;
}

interface TimelineData {
  milestones: Milestone[];
  summary: TimelineSummary;
  range: { start: string; end: string };
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  payment_due: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
  payment_received: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
  renewal: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
  upgrade: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500' },
  install: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', dot: 'bg-teal-500' },
  expiry: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500' },
  reactivation: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  commission: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', dot: 'bg-pink-500' },
};

const STATUS_BADGE: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  at_risk: 'bg-amber-100 text-amber-800',
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysFromNow = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
};

export default function TimelineMilestones() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState(90);
  const [daysBack, setDaysBack] = useState(30);
  const [filterRecordType, setFilterRecordType] = useState<'all' | 'service' | 'product'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const fetchTimeline = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          daysAhead: daysAhead.toString(),
          daysBack: daysBack.toString(),
        });
        if (filterRecordType !== 'all') {
          params.set('type', filterRecordType);
        }
        const res = await fetch(`/api/timeline?${params}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch timeline:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [daysAhead, daysBack, filterRecordType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data || data.milestones.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Timeline & Milestones</h2>
        <p className="text-center py-12 text-gray-500">No milestones found in the selected range</p>
      </div>
    );
  }

  const filteredMilestones = data.milestones.filter(m => {
    if (filterRecordType !== 'all' && m.recordType !== filterRecordType) return false;
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    return true;
  });

  const groupedByDate = filteredMilestones.reduce((acc, m) => {
    if (!acc[m.date]) acc[m.date] = [];
    acc[m.date].push(m);
    return acc;
  }, {} as Record<string, Milestone[]>);

  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Timeline & Milestones</h2>
            <p className="text-sm text-slate-500 mt-0.5">{data.range.start} to {data.range.end}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs font-medium text-slate-500">Total</p>
            <p className="text-xl font-semibold text-slate-900">{data.summary.total}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
            <p className="text-xs font-medium text-emerald-600">Completed</p>
            <p className="text-xl font-semibold text-emerald-700">{data.summary.completed}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs font-medium text-blue-600">Upcoming</p>
            <p className="text-xl font-semibold text-blue-700">{data.summary.upcoming}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <p className="text-xs font-medium text-amber-600">At Risk</p>
            <p className="text-xl font-semibold text-amber-700">{data.summary.at_risk}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-xs font-medium text-red-600">Overdue</p>
            <p className="text-xl font-semibold text-red-700">{data.summary.overdue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-slate-200">
              {(['all', 'service', 'product'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterRecordType(t)}
                  className={`px-3 py-1.5 capitalize font-medium text-sm transition-colors ${
                    filterRecordType === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Range:</label>
            <select
              value={`${daysBack}-${daysAhead}`}
              onChange={(e) => {
                const [back, ahead] = e.target.value.split('-').map(Number);
                setDaysBack(back);
                setDaysAhead(ahead);
              }}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="14-30">2w back, 1m ahead</option>
              <option value="30-90">1m back, 3m ahead</option>
              <option value="60-180">2m back, 6m ahead</option>
              <option value="90-365">3m back, 1y ahead</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="invoice">Invoices</option>
              <option value="subscription">Subscriptions</option>
              <option value="transaction">Transactions</option>
              <option value="extension">Extensions</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="at_risk">At Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {sortedDates.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No milestones match the selected filters</p>
        ) : (
          <div className="relative">
            {sortedDates.map((date, dateIndex) => {
              const milestones = groupedByDate[date];
              return (
                <div key={date} className="mb-6 last:mb-0">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-300 text-sm font-bold text-gray-700">
                      {new Date(date).getDate()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(date)}</p>
                      <p className="text-sm font-medium text-gray-600">{daysFromNow(date)} · {milestones.length} event{milestones.length > 1 ? 's' : ''}</p>
                    </div>
                    {dateIndex < sortedDates.length - 1 && (
                      <div className="flex-1 h-px bg-gray-200 ml-2" />
                    )}
                  </div>

                  {/* Milestones for this date */}
                  <div className="ml-5 pl-4 border-l-2 border-gray-200 space-y-2">
                    {milestones.map((m) => {
                      const colors = CATEGORY_COLORS[m.category] || CATEGORY_COLORS.payment_due;
                      return (
                        <div
                          key={m.id}
                          className={`${colors.bg} ${colors.border} border rounded-lg p-3 hover:shadow-md transition-shadow`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`text-sm font-semibold ${colors.text}`}>{m.title}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[m.status]}`}>
                                    {m.status.replace('_', ' ')}
                                  </span>
                                  <span className="text-xs font-semibold capitalize text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {m.recordType}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-700 mt-0.5 truncate">{m.description}</p>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                  <span className="capitalize font-medium">{m.type}</span>
                                  <span className="font-medium">{m.customer}</span>
                                </div>
                              </div>
                            </div>
                            {m.amount > 0 && (
                              <div className="text-right flex-shrink-0">
                                <p className="text-base font-bold text-gray-900">{formatCurrency(m.amount, m.currency)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
