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

  const getCustomerCount = () => {
    if (!selectedCustomer) return `${customers.length} total`;
    return `1 selected`;
  };

  const getStatusCount = () => {
    if (!selectedStatus) return `${statuses.length} total`;
    return `1 selected`;
  };

  return (
    <nav aria-label="Store data filters" className="flex flex-wrap items-center gap-6 p-5 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="sr-only">Filter Controls</h2>

      {/* Month Navigation Group */}
      {!hideMonthFilter && (
        <div role="group" aria-labelledby="month-nav-label" className="flex items-center gap-2">
          <span id="month-nav-label" className="text-sm font-semibold text-gray-800 mr-1">Month</span>
          <button
            onClick={goToPrevMonth}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 min-w-[70px]"
          >
            Prev
          </button>
          <span
            role="status"
            aria-live="polite"
            className="font-semibold min-w-[150px] text-center text-gray-900 text-base"
          >
            {formatMonthDisplay(currentMonth)}
          </span>
          <button
            onClick={goToNextMonth}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 min-w-[70px]"
          >
            Next
          </button>
        </div>
      )}

      {/* Month Picker */}
      {!hideMonthFilter && (
        <div className="flex items-center gap-3">
          <label htmlFor="month-picker" className="text-sm font-semibold text-gray-800">Jump to</label>
          <input
            id="month-picker"
            type="month"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onMonthChange(e.target.value);
            }}
            className="px-3 py-2 border border-gray-300 rounded font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
      )}

      {/* Type Toggle */}
      <div role="group" aria-labelledby="type-filter-label" className="flex items-center gap-2">
        <span id="type-filter-label" className="text-sm font-semibold text-gray-800">Type</span>
        <div className="flex rounded overflow-hidden border border-gray-300">
          {(['all', 'service', 'product'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              aria-pressed={currentType === t}
              className={`px-4 py-2 capitalize font-medium focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                currentType === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-3">
        <label htmlFor="status-filter" className="text-sm font-semibold text-gray-800">Status</label>
        <select
          id="status-filter"
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[150px]"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span role="status" aria-live="polite" className="text-sm text-gray-600">
          ({getStatusCount()})
        </span>
      </div>

      {/* Customer Filter */}
      <div className="flex items-center gap-3">
        <label htmlFor="customer-filter" className="text-sm font-semibold text-gray-800">Customer</label>
        <select
          id="customer-filter"
          value={selectedCustomer}
          onChange={(e) => onCustomerChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[180px]"
        >
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span role="status" aria-live="polite" className="text-sm text-gray-600">
          ({getCustomerCount()})
        </span>
      </div>
    </nav>
  );
}