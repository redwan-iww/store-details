// DB abstraction layer — swap adapter for different SQL engines
export { getDb, upsertTransaction, getTransactions, getCustomers, getStatuses, getMonths, closeDb } from './adapters/sqlite';
export type { Transaction, TransactionInput, DataFilters, DataResponse, UploadResponse } from './types';