import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Printer,
  Check,
  FileText,
} from 'lucide-react';
import { Person } from '../types/debty';
import { useDebty } from '../context/DebtyContext';
import { DynamicAmount } from './common/DynamicAmount';
import { IOSSwitch } from './common/IOSSwitch';
import { formatCents, formatSignedCents } from '../utils/money';
import { getDebtVisuals } from '../utils/colors';
import { formatDate } from '../utils/dates';

interface StatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
}

export const StatementModal: React.FC<StatementModalProps> = ({
  isOpen,
  onClose,
  person,
}) => {
  const { transactions, tags, settings } = useDebty();

  const [includeSettled, setIncludeSettled] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // Filter transactions for this person
  const personTransactions = useMemo(() => {
    return transactions.filter((t) => t.personId === person.id);
  }, [transactions, person.id]);

  // Display transactions based on toggle, sorted by date descending then createdAt descending
  const displayTransactions = useMemo(() => {
    const list = includeSettled
      ? personTransactions
      : personTransactions.filter((t) => !t.isSettled);

    return [...list].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.createdAt && a.createdAt ? b.createdAt.localeCompare(a.createdAt) : 0)
    );
  }, [personTransactions, includeSettled]);

  // Totals calculations
  const totals = useMemo(() => {
    let owedToMeCents = 0;
    let iOweCents = 0;

    for (const tx of displayTransactions) {
      if (tx.type === 'owed_to_me') {
        owedToMeCents += tx.amountCents;
      } else {
        iOweCents += tx.amountCents;
      }
    }

    const netBalanceCents = owedToMeCents - iOweCents;
    return { owedToMeCents, iOweCents, netBalanceCents };
  }, [displayTransactions]);

  const netVisuals = getDebtVisuals(totals.netBalanceCents, settings.swapRedGreen);

  const netStatusLabel = useMemo(() => {
    if (totals.netBalanceCents > 0) return `${person.name} owes you`;
    if (totals.netBalanceCents < 0) return `You owe ${person.name}`;
    return 'Account settled';
  }, [totals.netBalanceCents, person.name]);

  const assignedTags = useMemo(() => {
    if (!person.tagIds || person.tagIds.length === 0) return [];
    return tags.filter((t) => person.tagIds?.includes(t.id));
  }, [tags, person.tagIds]);

  const statementIssueDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Format share text for iOS Share Sheet or Clipboard
  const generateShareText = (): string => {
    const lines: string[] = [];
    lines.push(`📄 DEBTY — ACCOUNT STATEMENT`);
    lines.push(`Date: ${statementIssueDate}`);
    lines.push(`Contact: ${person.name}`);
    if (assignedTags.length > 0) {
      lines.push(`Tags: ${assignedTags.map((t) => t.name).join(', ')}`);
    }
    lines.push(`---------------------------------`);

    const netFormatted = formatSignedCents(totals.netBalanceCents, settings.currencySymbol);
    lines.push(`NET BALANCE: ${netFormatted} (${netStatusLabel})`);
    lines.push(`• Total Owed to You: ${formatCents(totals.owedToMeCents, settings.currencySymbol)}`);
    lines.push(`• Total You Owe: ${formatCents(totals.iOweCents, settings.currencySymbol)}`);
    lines.push(`---------------------------------`);
    lines.push(`TRANSACTIONS (${displayTransactions.length}):`);

    if (displayTransactions.length === 0) {
      lines.push(`(No active transactions)`);
    } else {
      displayTransactions.forEach((tx, idx) => {
        const sign = tx.type === 'owed_to_me' ? '+' : '-';
        const formattedAmount = `${sign}${formatCents(tx.amountCents, settings.currencySymbol)}`;
        const note = tx.comment ? ` - ${tx.comment}` : '';
        const settledMarker = tx.isSettled ? ' [Settled]' : '';
        lines.push(`${idx + 1}. [${formatDate(tx.date)}] ${formattedAmount}${note}${settledMarker}`);
      });
    }

    lines.push(`---------------------------------`);
    lines.push(`Generated via Debty App`);
    return lines.join('\n');
  };

  const handleShare = async () => {
    const text = generateShareText();
    const title = `Statement for ${person.name} — Debty`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Clipboard fallback
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy statement text:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. Interactive In-App Sheet Modal */}
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-[28px] bg-[var(--bg-grouped)] shadow-2xl z-10 overflow-hidden"
          >
            {/* Grabber Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            {/* Top Bar */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--separator)]">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--label-secondary)] active:scale-95 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold text-[var(--label-primary)]">
                Statement
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleShare}
                  title="Share Statement"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] active:scale-95 transition-transform"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  title="Print / Save PDF"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--ios-blue)] text-white active:scale-95 transition-transform shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Statement Preview */}
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe space-y-4">
              {/* Copied Toast Banner */}
              <AnimatePresence>
                {copiedToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Check className="w-4 h-4" />
                    <span>Statement text copied to clipboard!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header Info Card */}
              <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--separator)] shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[var(--ios-blue)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--label-secondary)]">
                      Account Statement
                    </span>
                  </div>
                  <span className="text-xs text-[var(--label-secondary)]">
                    {statementIssueDate}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[var(--label-primary)]">
                    {person.name}
                  </h3>
                  {assignedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assignedTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Net Balance Summary Card */}
              <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--separator)] shadow-sm text-center space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
                  {netStatusLabel}
                </p>

                <div className="py-1">
                  <DynamicAmount
                    cents={Math.abs(totals.netBalanceCents)}
                    currencySymbol={settings.currencySymbol}
                    direction={totals.netBalanceCents}
                    swapRedGreen={settings.swapRedGreen}
                    prefix={totals.netBalanceCents > 0 ? '+' : totals.netBalanceCents < 0 ? '-' : ''}
                    maxFontPx={36}
                    minFontPx={18}
                    className="font-extrabold tracking-tight justify-center"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--separator)] text-xs text-center">
                  <div className="min-w-0">
                    <span className="block text-[var(--label-secondary)] text-[11px] mb-0.5">Owed to you</span>
                    <DynamicAmount
                      cents={totals.owedToMeCents}
                      currencySymbol={settings.currencySymbol}
                      direction="owed_to_me"
                      swapRedGreen={settings.swapRedGreen}
                      maxFontPx={15}
                      minFontPx={10}
                      weightClass="font-bold"
                      className="justify-center"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[var(--label-secondary)] text-[11px] mb-0.5">You owe</span>
                    <DynamicAmount
                      cents={totals.iOweCents}
                      currencySymbol={settings.currencySymbol}
                      direction="i_owe"
                      swapRedGreen={settings.swapRedGreen}
                      maxFontPx={15}
                      minFontPx={10}
                      weightClass="font-bold"
                      className="justify-center"
                    />
                  </div>
                </div>
              </div>

              {/* Option: Include Settled History Toggle */}
              <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--separator)] shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--label-primary)]">
                    Include Settled History
                  </p>
                  <p className="text-xs text-[var(--label-secondary)]">
                    Show historical resolved transactions
                  </p>
                </div>
                <IOSSwitch
                  checked={includeSettled}
                  onChange={setIncludeSettled}
                  label="Include Settled History"
                />
              </div>

              {/* Transactions Ledger Table Preview */}
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--separator)] shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--bg-grouped)] border-b border-[var(--separator)] flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
                    Itemized Records ({displayTransactions.length})
                  </span>
                </div>

                {displayTransactions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--label-secondary)]">
                    No transactions to show.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--separator)] max-h-60 overflow-y-auto">
                    {displayTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[var(--label-primary)] truncate">
                            {tx.comment || (tx.type === 'owed_to_me' ? 'Lent' : 'Borrowed')}
                            {tx.isSettled && (
                              <span className="ml-1 text-[10px] text-[var(--label-tertiary)] font-normal">
                                (Settled)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[var(--label-secondary)]">
                            {formatDate(tx.date)}
                            {tx.dueDate ? ` • Due: ${formatDate(tx.dueDate)}` : ''}
                          </p>
                        </div>
                        <div className="max-w-[46%] min-w-0 text-right shrink-0">
                          <DynamicAmount
                            cents={tx.amountCents}
                            currencySymbol={settings.currencySymbol}
                            direction={tx.isSettled ? 'settled' : tx.type}
                            swapRedGreen={settings.swapRedGreen}
                            prefix={tx.type === 'owed_to_me' ? '+' : '-'}
                            maxFontPx={14}
                            minFontPx={10}
                            className={`font-bold justify-end ${
                              tx.isSettled ? 'line-through opacity-70' : ''
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="py-3 px-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--separator)] text-sm font-semibold text-[var(--ios-blue)] shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Statement</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-3 px-4 rounded-2xl bg-[var(--ios-blue)] text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* 2. Standalone Print Portal: Rendered directly into document.body outside #app-shell */}
      {ReactDOM.createPortal(
        <div id="printable-statement" className="hidden print:block p-8 font-sans">
          {/* Header */}
          <div className="border-b-2 border-black pb-4 mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-black">
                DEBTY
              </h1>
              <p className="text-sm text-gray-600 font-medium">
                Official Account Statement
              </p>
            </div>
            <div className="text-right text-xs text-gray-600">
              <p>Issue Date: <span className="font-bold text-black">{statementIssueDate}</span></p>
              <p>Contact: <span className="font-bold text-black">{person.name}</span></p>
              {assignedTags.length > 0 && (
                <p>Tags: {assignedTags.map((t) => t.name).join(', ')}</p>
              )}
            </div>
          </div>

          {/* Balance Summary Box */}
          <div className="p-4 mb-6 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-gray-500">
                Account Status
              </p>
              <p className="text-lg font-bold text-black">{netStatusLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase font-bold tracking-wider text-gray-500">
                Net Outstanding
              </p>
              <p className="text-2xl font-extrabold tabular-nums text-black">
                {formatSignedCents(totals.netBalanceCents, settings.currencySymbol)}
              </p>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="p-3 border border-gray-200 rounded-md">
              <span className="text-gray-500 text-xs uppercase block font-semibold">
                Total Owed to You
              </span>
              <span className="font-bold text-base text-black">
                {formatCents(totals.owedToMeCents, settings.currencySymbol)}
              </span>
            </div>
            <div className="p-3 border border-gray-200 rounded-md">
              <span className="text-gray-500 text-xs uppercase block font-semibold">
                Total You Owe
              </span>
              <span className="font-bold text-base text-black">
                {formatCents(totals.iOweCents, settings.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Transactions Table */}
          <table className="w-full text-left text-xs border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="py-2 px-2 font-bold uppercase">Date</th>
                <th className="py-2 px-2 font-bold uppercase">Description</th>
                <th className="py-2 px-2 font-bold uppercase">Due Date</th>
                <th className="py-2 px-2 font-bold uppercase text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    No transactions recorded.
                  </td>
                </tr>
              ) : (
                displayTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-200">
                    <td className="py-2.5 px-2">{formatDate(tx.date)}</td>
                    <td className="py-2.5 px-2 font-medium">
                      {tx.comment || (tx.type === 'owed_to_me' ? 'Lent money' : 'Borrowed money')}
                      {tx.isSettled && (
                        <span className="ml-1 text-[10px] text-gray-500 italic">
                          [Settled]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-gray-600">
                      {tx.dueDate ? formatDate(tx.dueDate) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold tabular-nums">
                      {tx.type === 'owed_to_me' ? '+' : '-'}
                      {formatCents(tx.amountCents, settings.currencySymbol)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer Note */}
          <div className="border-t border-gray-200 pt-4 text-center text-[10px] text-gray-500">
            <p>Generated by Debty — Private Personal Debt Tracker.</p>
            <p>All currency calculations stored in exact integer cents.</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
