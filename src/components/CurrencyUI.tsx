'use client';

import { useState } from 'react';
import { DEFAULT_EXCHANGE_RATES, getExchangeRateLabel, formatCurrency, type CurrencyBreakdown } from '@/lib/currency';

export function CurrencyConverterToggle({ enabled, onToggle }: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-gray-800">Show in USD</span>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export function ExchangeRateModal({ rates, onRatesChange, currencies, open, onClose }: {
  rates: Record<string, number>;
  onRatesChange: (rates: Record<string, number>) => void;
  currencies: string[];
  open: boolean;
  onClose: () => void;
}) {
  const nonUsdCurrencies = currencies.filter(c => c !== 'USD');
  if (!open || nonUsdCurrencies.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Exchange Rates"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Exchange Rates</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm font-medium text-gray-600 mb-4">
            Enter how many units of each currency equal <span className="font-bold text-gray-900">1 USD</span>
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {nonUsdCurrencies.map(currency => (
              <div key={currency} className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-800">{currency}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={rates[currency] ?? DEFAULT_EXCHANGE_RATES[currency]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        onRatesChange({ ...rates, [currency]: val });
                      }
                    }}
                    className="w-full px-3 py-2.5 text-base font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 pointer-events-none">
                    per $1
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              onClick={() => onRatesChange({ ...DEFAULT_EXCHANGE_RATES })}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Reset to defaults
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExchangeRateInfo({ currencies, rates, compact = false }: {
  currencies: string[];
  rates?: Record<string, number>;
  compact?: boolean;
}) {
  const nonUsdCurrencies = currencies.filter(c => c !== 'USD');
  if (nonUsdCurrencies.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {nonUsdCurrencies.map(c => (
          <span key={c} className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded" title={getExchangeRateLabel(c, rates)}>
            {c}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-sm font-semibold text-gray-800 mb-2">Exchange Rates (per 1 USD)</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {nonUsdCurrencies.map(c => (
          <span key={c} className="text-sm font-medium text-gray-700">
            {getExchangeRateLabel(c, rates)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CurrencyBreakdownList({ currencies, inline = false, convertToUsd = false, rates }: {
  currencies: CurrencyBreakdown[];
  inline?: boolean;
  convertToUsd?: boolean;
  rates?: Record<string, number>;
}) {
  if (!currencies || currencies.length === 0) return <span className="text-gray-500">-</span>;

  if (convertToUsd) {
    const totalUsd = currencies.reduce((sum, c) => {
      const rate = rates?.[c.currency] ?? DEFAULT_EXCHANGE_RATES[c.currency] ?? 1;
      return sum + (c.currency === 'USD' ? c.amount : c.amount / rate);
    }, 0);
    return <span className="font-semibold text-gray-900">{formatCurrency(totalUsd, 'USD')}</span>;
  }

  if (currencies.length === 1) {
    const c = currencies[0];
    return <span className="font-semibold text-gray-900">{formatCurrency(c.amount, c.currency)}</span>;
  }

  if (inline) {
    return (
      <div className="flex flex-wrap gap-2">
        {currencies.map(c => (
          <span key={c.currency} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            {c.currency}: {formatCurrency(c.amount, c.currency)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {currencies.map(c => (
        <div key={c.currency} className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-800">{c.currency}</span>
          <span className="font-bold text-gray-900">{formatCurrency(c.amount, c.currency)}</span>
        </div>
      ))}
    </div>
  );
}

export function CurrencySummaryWithConversion({ currencies, convertToUsd, rates }: {
  currencies: { currency: string; total: number; count: number }[];
  convertToUsd: boolean;
  rates?: Record<string, number>;
}) {
  if (!currencies || currencies.length === 0) return null;

  if (convertToUsd) {
    const totalByUsd = currencies.reduce((acc, c) => {
      const rate = rates?.[c.currency] ?? DEFAULT_EXCHANGE_RATES[c.currency] ?? 1;
      const usdAmount = c.currency === 'USD' ? c.total : c.total / rate;
      return acc + usdAmount;
    }, 0);
    const totalCount = currencies.reduce((sum, c) => sum + c.count, 0);

    return (
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-lg border border-blue-300">
          <span className="text-sm font-bold text-blue-900">USD (converted)</span>
          <span className="text-base font-bold text-blue-900">{formatCurrency(totalByUsd, 'USD')}</span>
          <span className="text-sm font-medium text-blue-700">({totalCount} records)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {currencies.map(c => (
        <div key={c.currency} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-300">
          <span className="text-sm font-bold text-gray-900">{c.currency}</span>
          <span className="text-base font-bold text-gray-900">{formatCurrency(c.total, c.currency)}</span>
          <span className="text-sm font-medium text-gray-600">({c.count} records)</span>
        </div>
      ))}
    </div>
  );
}
