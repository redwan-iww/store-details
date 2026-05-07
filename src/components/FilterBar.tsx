'use client';

import { useState, useEffect } from 'react';

interface FilterBarProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  currentType: 'all' | 'service' | 'product';
  onTypeChange: (type: 'all' | 'service' | 'product') => void;
  customers: string[];
  selectedCustomer: string;
  onCustomerChange: (customer: string) => void;
  statuses: string[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  hideMonthFilter?: boolean;
}

export default function FilterBar({
  currentMonth,
  onMonthChange,
  currentType,
  onTypeChange,
  customers,
  selectedCustomer,
  onCustomerChange,
  statuses,
  selectedStatus,
  onStatusChange,
  hideMonthFilter,
}: FilterBarProps) {
  const [inputValue, setInputValue] = useState(currentMonth);

  useEffect(() => {
    setInputValue(currentMonth);
  }, [currentMonth]);

  const goToPrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    onMonthChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    onMonthChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonthDisplay = (month: string) => {
    const [year, m] = month.split('-').map(Number);
    return new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <nav aria-label="Store data filters" className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <h2 className="sr-only">Filter Controls</h2>

      {!hideMonthFilter && (
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium text-slate-700 transition-colors"
          >
            Prev
          </button>
          <span className="text-sm font-semibold text-slate-900 min-w-[130px] text-center">
            {formatMonthDisplay(currentMonth)}
          </span>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium text-slate-700 transition-colors"
          >
            Next
          </button>
          <input
            type="month"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onMonthChange(e.target.value);
            }}
            className="px-2 py-1.5 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-slate-200">
          {(['all', 'service', 'product'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              aria-pressed={currentType === t}
              className={`px-3 py-1.5 capitalize text-sm font-medium transition-colors ${
                currentType === t
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={selectedCustomer}
          onChange={(e) => onCustomerChange(e.target.value)}
          className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
        >
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </nav>
  );
}
