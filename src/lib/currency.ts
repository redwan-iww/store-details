const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AUD: 'en-AU',
  CAD: 'en-CA',
  INR: 'en-IN',
  MXN: 'es-MX',
  AED: 'ar-AE',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  INR: '₹',
  MXN: 'MX$',
  AED: 'د.إ',
};

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.54,
  CAD: 1.37,
  INR: 83.5,
  MXN: 17.2,
  AED: 3.67,
};

export function convertToUSD(amount: number, currency: string, rates?: Record<string, number>): number {
  const rate = rates?.[currency] ?? DEFAULT_EXCHANGE_RATES[currency] ?? 1;
  if (currency === 'USD') return amount;
  return amount / rate;
}

export function formatCurrency(value: number, currency: string, convertToUsd = false, rates?: Record<string, number>): string {
  const displayValue = convertToUsd ? convertToUSD(value, currency, rates) : value;
  const displayCurrency = convertToUsd ? 'USD' : currency;
  const locale = CURRENCY_LOCALES[displayCurrency] || 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: displayCurrency,
      maximumFractionDigits: 0,
    }).format(displayValue);
  } catch {
    return `${CURRENCY_SYMBOLS[displayCurrency] || displayCurrency}${displayValue.toLocaleString()}`;
  }
}

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export interface CurrencyBreakdown {
  currency: string;
  amount: number;
  count: number;
}

export function getExchangeRateLabel(currency: string, rates?: Record<string, number>): string {
  const rate = rates?.[currency] ?? DEFAULT_EXCHANGE_RATES[currency] ?? 1;
  if (currency === 'USD') return '1 USD = 1 USD';
  return `1 USD = ${rate.toFixed(2)} ${currency}`;
}
