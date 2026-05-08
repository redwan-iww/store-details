// DB abstraction layer — swap adapter for different SQL engines
export { getDb, upsertTransaction, getTransactions, getCustomers, getStatuses, getMonths } from './adapters/sqlite';
export type { Transaction, TransactionInput, DataFilters, DataResponse } from './types';