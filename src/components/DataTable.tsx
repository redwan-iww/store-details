'use client';

import type { Transaction } from '@/lib/types';

interface DataTableProps {
  records: Transaction[];
  type: 'all' | 'service' | 'product';
}

const SERVICE_COLUMNS = ['Date', 'Customer', 'Description', 'Amount', 'Status', 'Source'];
const PRODUCT_COLUMNS = ['Date', 'Customer', 'Description', 'Amount', 'Status', 'Source'];

export default function DataTable({ records, type }: DataTableProps) {
  const columns = type === 'product' ? PRODUCT_COLUMNS : SERVICE_COLUMNS;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);

  if (records.length === 0) {
    return (
      <div role="status" aria-live="polite" className="text-center py-12 text-gray-500">
        No records found for this period
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <caption className="sr-only">
          {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)} records for the selected month
        </caption>
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record, idx) => (
            <tr key={record.id} className="hover:bg-gray-50 focus-within:bg-blue-50">
              <th scope="row" className="px-4 py-2 whitespace-nowrap text-sm font-normal text-gray-900">
                {formatDate(record.date)}
              </th>
              <td className="px-4 py-2 text-sm text-gray-700">{record.customer || '-'}</td>
              <td className="px-4 py-2 text-sm text-gray-700 max-w-xs truncate" title={record.description || undefined}>
                {record.description || '-'}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatAmount(record.amount)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm">
                <span
                  role="img"
                  aria-label={`Status: ${record.status}`}
                  className={`px-2 py-0.5 rounded text-xs ${
                    record.status === 'active' || record.status === 'Closed' || record.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {record.status}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                {record.source_file.replace('.csv', '')}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-100">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700">Total ({records.length} records)</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{formatAmount(totalAmount)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}