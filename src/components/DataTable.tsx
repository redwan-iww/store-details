'use client';

import type { Transaction } from '@/lib/types';
import { formatCurrency, DEFAULT_EXCHANGE_RATES, convertToUSD } from '@/lib/currency';

interface DataTableProps {
  records: Transaction[];
  type: 'all' | 'service' | 'product';
  convertToUsd?: boolean;
  exchangeRates?: Record<string, number>;
}

const SERVICE_COLUMNS = ['Date', 'Customer', 'Description', 'Amount', 'Currency', 'Status', 'Source'];
const PRODUCT_COLUMNS = ['Date', 'Customer', 'Description', 'Amount', 'Currency', 'Status', 'Source'];

export default function DataTable({ records, type, convertToUsd = false, exchangeRates = DEFAULT_EXCHANGE_RATES }: DataTableProps) {
  const columns = type === 'product' ? PRODUCT_COLUMNS : SERVICE_COLUMNS;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalByCurrency = records.reduce((acc, r) => {
    const cur = r.currency || 'USD';
    if (!acc[cur]) acc[cur] = { amount: 0, count: 0 };
    acc[cur].amount += r.amount || 0;
    acc[cur].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  if (records.length === 0) {
    return (
      <div role="status" aria-live="polite" className="text-center py-12 text-slate-500">
        No records found for this period
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <caption className="sr-only">
          {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)} records for the selected month
        </caption>
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {records.map((record, idx) => (
            <tr key={record.id} className="hover:bg-slate-50 focus-within:bg-blue-50">
              <th scope="row" className="px-4 py-2 whitespace-nowrap text-sm font-normal text-slate-900">
                {formatDate(record.date)}
              </th>
              <td className="px-4 py-2 text-sm text-slate-700">{record.customer || '-'}</td>
              <td className="px-4 py-2 text-sm text-slate-700 max-w-xs truncate" title={record.description || undefined}>
                {record.description || '-'}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
                {formatCurrency(record.amount, record.currency, convertToUsd, exchangeRates)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {record.currency || 'USD'}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm">
                <span
                  role="img"
                  aria-label={`Status: ${record.status}`}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    record.status === 'active' || record.status === 'Closed' || record.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {record.status}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">
                {record.source_file.replace('.csv', '')}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-900">Total ({records.length} records)</td>
            <td colSpan={1} className="px-4 py-3">
              {convertToUsd ? (
                <span className="text-base font-bold text-slate-900">
                  {formatCurrency(
                    Object.entries(totalByCurrency).reduce((sum, [currency, data]) => {
                      return sum + convertToUSD(data.amount, currency, exchangeRates);
                    }, 0),
                    'USD'
                  )}
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(totalByCurrency).map(([currency, data]) => (
                    <span key={currency} className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-white border border-slate-200 text-slate-800">
                      {currency}: {formatCurrency(data.amount, currency)}
                    </span>
                  ))}
                </div>
              )}
            </td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
