export type RecordType = 'service' | 'product';

export interface Transaction {
  id: string;
  type: RecordType;
  source_file: string;
  date: string;
  month: string;
  customer: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  raw_data: string;
}

export interface TransactionInput {
  id: string;
  type: RecordType;
  source_file: string;
  date: string;
  month: string;
  customer: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  raw_data: Record<string, unknown>;
}

export interface DataFilters {
  month: string;
  type: 'all' | RecordType;
  customer?: string;
  status?: string;
}

export interface DataResponse {
  month: string;
  type: string;
  customer?: string;
  records: Transaction[];
  summary: {
    totalAmount: number;
    count: number;
  };
}

export interface UploadResponse {
  source: string;
  inserted: number;
  skipped: number;
}

export const CSV_CONFIG = {
  Books_Invoice: {
    type: 'service' as RecordType,
    idField: 'Invoice Number',
    dateField: 'Invoice Date',
    amountFields: ['Total', 'SubTotal'],
    customerFields: ['Customer Name'],
    descriptionField: 'Item Name',
    statusField: 'Invoice Status',
  },
  Extension_Users: {
    type: 'product' as RecordType,
    idFields: ['Extension User Owner.id', 'First Install Date'],
    dateField: 'First Install Date',
    amountFields: [],
    customerFields: ['Company Name', 'Email'],
    descriptionField: 'Extension User Name',
    statusField: 'Status',
  },
  Store_Subscriptions: {
    type: 'product' as RecordType,
    idField: 'Subscription ID',
    dateField: 'Subscription Start Date',
    amountFields: ['Total Revenue', 'Next Recurring Amount'],
    customerFields: ['Customer Company Name'],
    descriptionField: 'Plan Name',
    statusField: 'Status',
  },
  Store_Transactions: {
    type: 'product' as RecordType,
    idField: 'Transaction ID',
    dateField: 'Transaction Date',
    amountFields: ['Transaction Amount'],
    customerFields: ['Customer Company Name'],
    descriptionField: 'Description',
    statusField: 'Transaction Type',
  },
  Store_Commissions: {
    type: 'service' as RecordType,
    idField: 'Commission ID',
    dateField: 'Commission Accounted Date',
    amountFields: ['Commission Amount', 'Payout Commission'],
    customerFields: ['Customer Company Name'],
    descriptionField: 'Service Name',
    statusField: 'Status',
  },
} as const;

export type CSVSource = keyof typeof CSV_CONFIG;