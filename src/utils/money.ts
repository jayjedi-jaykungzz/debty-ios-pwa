import { Person, Transaction, PersonWithStats, DashboardTotals } from '../types/debty';
import { getDueDateStatus } from './dates';

/**
 * Parses a decimal string or number into exact integer cents without floating point drift.
 * Example: "123.45" -> 12345, "100" -> 10000, 50.2 -> 5020.
 */
export function parseToCents(val: string | number): number {
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || Number.isNaN(val)) return 0;
    return Math.round(val * 100);
  }

  const clean = val.trim().replace(/,/g, '');
  if (!clean) return 0;

  const parts = clean.split('.');
  const wholeStr = parts[0] || '0';
  const whole = parseInt(wholeStr, 10);
  if (Number.isNaN(whole)) return 0;

  let cents = 0;
  if (parts.length > 1) {
    const decimalStr = (parts[1] + '00').slice(0, 2);
    cents = parseInt(decimalStr, 10) || 0;
  }

  const sign = clean.startsWith('-') ? -1 : 1;
  const absWhole = Math.abs(whole);
  return sign * (absWhole * 100 + cents);
}

/**
 * Formats an integer cents value into an exact currency string with thousand separators.
 * Uses strict integer division and modulo to ensure zero floating-point rounding errors.
 * Example: 1234567 cents -> "฿12,345.67", or without decimals -> "฿12,345" if cents === 0.
 */
export function formatCents(
  cents: number,
  currencySymbol: string = '฿',
  options: { forceDecimals?: boolean; includeSymbol?: boolean } = {}
): string {
  const { forceDecimals = true, includeSymbol = true } = options;
  const isNegative = cents < 0;
  const absCents = Math.abs(Math.round(cents));

  const whole = Math.floor(absCents / 100);
  const remainder = absCents % 100;

  // Format whole number with commas
  const wholeFormatted = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let result = wholeFormatted;
  if (forceDecimals || remainder > 0) {
    const decFormatted = remainder.toString().padStart(2, '0');
    result += `.${decFormatted}`;
  }

  const prefix = isNegative ? '-' : '';
  const symbolPart = includeSymbol ? (currencySymbol ? `${currencySymbol}` : '') : '';

  return `${prefix}${symbolPart}${result}`;
}

/**
 * Formats signed cents with explicit '+' or '-' sign.
 * Example: +1250 cents -> "+฿12.50", -500 cents -> "-฿5.00", 0 -> "฿0.00".
 */
export function formatSignedCents(
  cents: number,
  currencySymbol: string = '฿',
  forceDecimals: boolean = true
): string {
  if (cents === 0) {
    return formatCents(0, currencySymbol, { forceDecimals });
  }
  const sign = cents > 0 ? '+' : '-';
  const absFormatted = formatCents(Math.abs(cents), currencySymbol, { forceDecimals });
  return `${sign}${absFormatted}`;
}

/**
 * Calculates a person's active net balance in integer cents.
 * Positive (> 0): They owe me (owed_to_me).
 * Negative (< 0): I owe them (i_owe).
 * Zero (= 0): Balanced / settled.
 */
export function getPersonActiveBalanceCents(personId: string, transactions: Transaction[]): number {
  let netCents = 0;
  for (const tx of transactions) {
    if (tx.personId === personId && !tx.isSettled) {
      if (tx.type === 'owed_to_me') {
        netCents += tx.amountCents;
      } else {
        netCents -= tx.amountCents;
      }
    }
  }
  return netCents;
}

/**
 * Computes full stats for a person from their transactions.
 */
export function getPersonStats(person: Person, transactions: Transaction[]): PersonWithStats {
  let activeBalanceCents = 0;
  let owedToMeCents = 0;
  let iOweCents = 0;
  let activeTransactionCount = 0;
  let settledTransactionCount = 0;
  let latestTransactionDate: string | null = null;
  let hasOverdue = false;
  let hasDueSoon = false;

  for (const tx of transactions) {
    if (tx.personId !== person.id) continue;

    if (tx.isSettled) {
      settledTransactionCount++;
    } else {
      activeTransactionCount++;
      if (tx.type === 'owed_to_me') {
        owedToMeCents += tx.amountCents;
        activeBalanceCents += tx.amountCents;
      } else {
        iOweCents += tx.amountCents;
        activeBalanceCents -= tx.amountCents;
      }

      if (tx.dueDate) {
        const dueStatus = getDueDateStatus(tx.dueDate, false);
        if (dueStatus === 'overdue') hasOverdue = true;
        if (dueStatus === 'due_today' || dueStatus === 'due_soon') hasDueSoon = true;
      }
    }

    if (!latestTransactionDate || tx.date > latestTransactionDate) {
      latestTransactionDate = tx.date;
    }
  }

  return {
    ...person,
    activeBalanceCents,
    owedToMeCents,
    iOweCents,
    activeTransactionCount,
    settledTransactionCount,
    latestTransactionDate,
    hasOverdue,
    hasDueSoon,
  };
}

/**
 * Computes dashboard top-level summaries across all unarchived people.
 */
export function getDashboardTotals(people: Person[], transactions: Transaction[]): DashboardTotals {
  let totalOwedToMeCents = 0;
  let totalIOweCents = 0;
  let activePeopleCount = 0;

  const activePeopleMap = new Set<string>();
  for (const p of people) {
    if (!p.isArchived) {
      activePeopleMap.add(p.id);
      activePeopleCount++;
    }
  }

  // Calculate per person active balance first, then aggregate
  for (const personId of activePeopleMap) {
    const bal = getPersonActiveBalanceCents(personId, transactions);
    if (bal > 0) {
      totalOwedToMeCents += bal;
    } else if (bal < 0) {
      totalIOweCents += Math.abs(bal);
    }
  }

  const netBalanceCents = totalOwedToMeCents - totalIOweCents;

  return {
    netBalanceCents,
    totalOwedToMeCents,
    totalIOweCents,
    activePeopleCount,
  };
}
