import { DueDateStatus } from '../types/debty';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into a local Date object (at midnight).
 */
export function parseISODate(isoStr: string): Date {
  const [year, month, day] = isoStr.split('-').map((v) => parseInt(v, 10));
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Determines whether a due date is overdue, due today, due soon (within 3 days), or upcoming.
 */
export function getDueDateStatus(dueDate?: string | null, isSettled: boolean = false): DueDateStatus {
  if (!dueDate || isSettled) return null;

  const todayStr = getTodayISO();
  if (dueDate === todayStr) return 'due_today';

  const today = parseISODate(todayStr).getTime();
  const target = parseISODate(dueDate).getTime();
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due_today';
  if (diffDays <= 3) return 'due_soon';
  return 'upcoming';
}

/**
 * Returns a human-friendly label for a due date.
 * Example: "Overdue by 2 days", "Due today", "Due in 3 days", "Due Oct 15".
 */
export function getDueDateLabel(dueDate?: string | null, isSettled: boolean = false): string | null {
  if (!dueDate || isSettled) return null;

  const todayStr = getTodayISO();
  if (dueDate === todayStr) return 'Due today';

  const today = parseISODate(todayStr).getTime();
  const target = parseISODate(dueDate).getTime();
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return absDays === 1 ? '1 day overdue' : `${absDays} days overdue`;
  }
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 3) return `Due in ${diffDays} days`;

  return `Due ${formatDate(dueDate, { month: 'short', day: 'numeric' })}`;
}

/**
 * Formats YYYY-MM-DD string into an iOS-style readable date.
 * Examples: "Today", "Yesterday", "Oct 12, 2026", "Mon, Oct 12".
 */
export function formatDate(
  isoStr: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!isoStr) return '';
  const date = parseISODate(isoStr);

  const todayStr = getTodayISO();
  if (isoStr === todayStr) return 'Today';

  const today = parseISODate(todayStr);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;

  if (isoStr === yesterdayStr) return 'Yesterday';

  return date.toLocaleDateString('en-US', options);
}
