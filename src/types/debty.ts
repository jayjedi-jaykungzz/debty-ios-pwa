export type TransactionType = 'owed_to_me' | 'i_owe';

export type DueDateStatus = 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | null;

export type SortByOption = 'debt_total' | 'recent' | 'name';

export type AppTheme = 'light' | 'dark' | 'system';

export interface Person {
  id: string;
  name: string;
  avatarColor: string;
  tagIds: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  personId: string;
  amountCents: number; // Stored strictly as positive integer cents (e.g. 1000 = 10.00)
  type: TransactionType;
  comment: string;
  date: string; // ISO YYYY-MM-DD
  dueDate?: string | null; // ISO YYYY-MM-DD or null
  receiptImageBase64?: string | null; // Data URL string or null
  isSettled: boolean;
  settledGroupId?: string | null;
  isSettlementEntry?: boolean;
  createdAt: string; // ISO 8601 timestamp
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface AppSettings {
  id: 'default';
  currencySymbol: string;
  theme: AppTheme;
  swapRedGreen: boolean;
  sortBy: SortByOption;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  people: Person[];
  transactions: Transaction[];
  tags: Tag[];
  settings: AppSettings;
}

export interface PersonWithStats extends Person {
  activeBalanceCents: number; // Net active balance in integer cents
  owedToMeCents: number;      // Total active amount owed to me
  iOweCents: number;          // Total active amount I owe
  activeTransactionCount: number;
  settledTransactionCount: number;
  latestTransactionDate: string | null;
  hasOverdue: boolean;
  hasDueSoon: boolean;
}

export interface DashboardTotals {
  netBalanceCents: number;
  totalOwedToMeCents: number;
  totalIOweCents: number;
  activePeopleCount: number;
}
