import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  FileText,
  Edit2,
  Plus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Tag as TagIcon,
  AlertCircle,
  Camera,
  X,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Person, Transaction, TransactionType } from '../types/debty';
import { useDebty } from '../context/DebtyContext';
import { Avatar } from './common/Avatar';
import { DynamicAmount } from './common/DynamicAmount';
import { TransactionModal } from './TransactionModal';
import { getDebtVisuals } from '../utils/colors';
import { getDueDateStatus, getDueDateLabel, formatDate } from '../utils/dates';
import { getPersonActiveBalanceCents, formatCents } from '../utils/money';

interface PersonDetailProps {
  person: Person;
  onBack: () => void;
  onEditPerson: (person: Person) => void;
  onOpenStatement?: (person: Person) => void;
}

export const PersonDetail: React.FC<PersonDetailProps> = ({
  person,
  onBack,
  onEditPerson,
  onOpenStatement,
}) => {
  const { transactions, tags, settleUpPerson, updatePerson, settings } = useDebty();

  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [initialTxType, setInitialTxType] = useState<TransactionType>('owed_to_me');
  const [isSettledExpanded, setIsSettledExpanded] = useState<boolean>(false);
  const [showTagPicker, setShowTagPicker] = useState<boolean>(false);
  const [showSettleConfirm, setShowSettleConfirm] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // All transactions for this person
  const personTransactions = useMemo(() => {
    return transactions.filter((t) => t.personId === person.id);
  }, [transactions, person.id]);

  // Active (unsettled) transactions sorted by date descending, then createdAt descending
  const activeTransactions = useMemo(() => {
    return personTransactions
      .filter((t) => !t.isSettled)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.createdAt && a.createdAt ? b.createdAt.localeCompare(a.createdAt) : 0)
      );
  }, [personTransactions]);

  // Settled transactions sorted by date descending, then createdAt descending
  const settledTransactions = useMemo(() => {
    return personTransactions
      .filter((t) => t.isSettled)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.createdAt && a.createdAt ? b.createdAt.localeCompare(a.createdAt) : 0)
      );
  }, [personTransactions]);

  // Active net balance
  const activeBalanceCents = useMemo(() => {
    return getPersonActiveBalanceCents(person.id, transactions);
  }, [person.id, transactions]);

  const balanceVisuals = getDebtVisuals(activeBalanceCents, settings.swapRedGreen);

  // Status text for hero pill
  const balanceStatusLabel = useMemo(() => {
    if (activeBalanceCents > 0) return 'Owes you';
    if (activeBalanceCents < 0) return 'You owe';
    return 'Settled up';
  }, [activeBalanceCents]);

  const handleOpenAddTx = (type: TransactionType) => {
    setSelectedTx(null);
    setInitialTxType(type);
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    setSelectedTx(tx);
    setInitialTxType(tx.type);
    setIsTxModalOpen(true);
  };

  const handleConfirmSettleUp = async () => {
    await settleUpPerson(person.id);
    setShowSettleConfirm(false);
  };

  const handleToggleTag = async (tagId: string) => {
    const currentTags = person.tagIds || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId];
    await updatePerson(person.id, { tagIds: newTags });
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-30 flex flex-col bg-[var(--bg-grouped)] overflow-hidden"
    >
      {/* Top Blurred iOS Navigation Bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 pt-safe pb-2 bg-[var(--bg-card)]/80 backdrop-blur-xl border-b border-[var(--separator)]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[var(--ios-blue)] font-medium text-base active:opacity-60 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Debty</span>
        </button>

        <h1 className="text-base font-semibold text-[var(--label-primary)] truncate max-w-[180px] text-center">
          {person.name}
        </h1>

        <div className="flex items-center gap-2">
          {onOpenStatement && (
            <button
              type="button"
              onClick={() => onOpenStatement(person)}
              title="Statement"
              className="p-2 rounded-full text-[var(--ios-blue)] active:bg-blue-500/10 transition-colors"
            >
              <FileText className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEditPerson(person)}
            title="Edit Person"
            className="p-2 rounded-full text-[var(--ios-blue)] active:bg-blue-500/10 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-safe space-y-5">
        {/* Hero Balance Card */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--separator)] shadow-sm flex flex-col items-center text-center space-y-3">
          <Avatar name={person.name} avatarColor={person.avatarColor} size="lg" />

          <div>
            <h2 className="text-xl font-bold text-[var(--label-primary)]">{person.name}</h2>
            <div className="mt-1">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: `${balanceVisuals.color}18`,
                  color: balanceVisuals.color,
                }}
              >
                {balanceStatusLabel}
              </span>
            </div>
          </div>

          <div className="w-full py-1">
            <DynamicAmount
              cents={Math.abs(activeBalanceCents)}
              currencySymbol={settings.currencySymbol}
              direction={activeBalanceCents}
              swapRedGreen={settings.swapRedGreen}
              maxFontPx={42}
              minFontPx={20}
              className="font-extrabold tracking-tight justify-center"
            />
          </div>

          {/* Tag Chips Row */}
          <div className="w-full pt-2 border-t border-[var(--separator)] flex flex-wrap items-center justify-center gap-1.5">
            {person.tagIds?.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <span
                  key={tag.id}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg-grouped)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] border border-[var(--separator)] flex items-center gap-1"
            >
              <TagIcon className="w-3 h-3" />
              <span>{showTagPicker ? 'Done' : '+ Tags'}</span>
            </button>
          </div>

          {/* Inline Tag Toggle Popover */}
          <AnimatePresence>
            {showTagPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full overflow-hidden pt-2"
              >
                <div className="p-3 bg-[var(--bg-grouped)] rounded-2xl border border-[var(--separator)] flex flex-wrap gap-1.5 justify-center">
                  {tags.map((tag) => {
                    const isSelected = person.tagIds?.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          isSelected
                            ? 'text-white shadow-sm'
                            : 'bg-[var(--bg-card)] text-[var(--label-secondary)] border border-[var(--separator)]'
                        }`}
                        style={{
                          backgroundColor: isSelected ? tag.color : undefined,
                        }}
                      >
                        {tag.name} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Action Bar */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOpenAddTx('owed_to_me')}
            className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--separator)] shadow-sm flex items-center gap-2.5 active:scale-[0.98] transition-transform"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: getDebtVisuals('owed_to_me', settings.swapRedGreen).color }}
            >
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-[var(--label-secondary)] uppercase">They owe me</p>
              <p className="text-sm font-bold text-[var(--label-primary)]">+ Add Record</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddTx('i_owe')}
            className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--separator)] shadow-sm flex items-center gap-2.5 active:scale-[0.98] transition-transform"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: getDebtVisuals('i_owe', settings.swapRedGreen).color }}
            >
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-[var(--label-secondary)] uppercase">I owe them</p>
              <p className="text-sm font-bold text-[var(--label-primary)]">+ Add Record</p>
            </div>
          </button>
        </div>

        {/* Shareable Statement Button */}
        {onOpenStatement && (
          <button
            type="button"
            onClick={() => onOpenStatement(person)}
            className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--separator)] text-xs font-semibold text-[var(--ios-blue)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Export / Share PDF Statement</span>
          </button>
        )}

        {/* Settle Up Banner when balance is non-zero */}
        {activeBalanceCents !== 0 && (
          <button
            type="button"
            onClick={() => setShowSettleConfirm(true)}
            className="w-full p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--separator)] shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-[var(--label-primary)]">Settle Up Entire Balance</h3>
                <p className="text-xs text-[var(--label-secondary)]">
                  Record full payment & move ledger to Settled History
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500 text-white shadow-sm">
              Settle
            </span>
          </button>
        )}

        {/* Active Ledger Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
              Active Transactions ({activeTransactions.length})
            </h3>
            <button
              type="button"
              onClick={() => handleOpenAddTx('owed_to_me')}
              className="text-xs font-semibold text-[var(--ios-blue)] flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {activeTransactions.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-2xl p-8 border border-[var(--separator)] text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-base font-semibold text-[var(--label-primary)]">All clear!</p>
              <p className="text-xs text-[var(--label-secondary)]">
                There are no outstanding debts with {person.name}.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--separator)] divide-y divide-[var(--separator)] shadow-sm overflow-hidden">
              {activeTransactions.map((tx) => {
                const dueStatus = tx.dueDate ? getDueDateStatus(tx.dueDate, tx.isSettled) : null;
                const dueLabel = tx.dueDate ? getDueDateLabel(tx.dueDate, tx.isSettled) : null;

                return (
                  <div
                    key={tx.id}
                    onClick={() => handleOpenEditTx(tx)}
                    className="p-4 flex items-center justify-between gap-3 active:bg-gray-100 dark:active:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--label-primary)] truncate">
                          {tx.comment || (tx.type === 'owed_to_me' ? 'Lent money' : 'Borrowed money')}
                        </span>
                        {tx.receiptImageBase64 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage(tx.receiptImageBase64 || null);
                            }}
                            className="p-1 rounded-md bg-[var(--bg-grouped)] text-[var(--ios-blue)] hover:opacity-80"
                            title="View receipt"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[var(--label-secondary)]">
                        <span>{formatDate(tx.date)}</span>
                        {dueStatus && dueLabel && (
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              dueStatus === 'overdue'
                                ? 'text-red-500'
                                : dueStatus === 'due_today' || dueStatus === 'due_soon'
                                ? 'text-amber-500'
                                : 'text-[var(--label-secondary)]'
                            }`}
                          >
                            • <AlertCircle className="w-3 h-3" />
                            {dueLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="max-w-[46%] min-w-0 text-right shrink-0">
                      <DynamicAmount
                        cents={tx.amountCents}
                        currencySymbol={settings.currencySymbol}
                        direction={tx.type}
                        swapRedGreen={settings.swapRedGreen}
                        prefix={tx.type === 'owed_to_me' ? '+' : '-'}
                        maxFontPx={18}
                        minFontPx={12}
                        className="font-bold justify-end"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collapsible Settled History Accordion */}
        {settledTransactions.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsSettledExpanded(!isSettledExpanded)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--separator)] text-xs font-semibold text-[var(--label-secondary)] shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Settled History ({settledTransactions.length})</span>
              </div>
              {isSettledExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {isSettledExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--separator)] divide-y divide-[var(--separator)] shadow-sm opacity-80">
                    {settledTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => handleOpenEditTx(tx)}
                        className="p-3.5 flex items-center justify-between gap-3 active:bg-gray-100 dark:active:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-[var(--label-primary)] truncate line-through">
                              {tx.comment || (tx.type === 'owed_to_me' ? 'Lent money' : 'Borrowed money')}
                            </p>
                            {tx.receiptImageBase64 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxImage(tx.receiptImageBase64 || null);
                                }}
                                className="p-1 rounded-md bg-[var(--bg-grouped)] text-[var(--ios-blue)] hover:opacity-80"
                                title="View receipt"
                              >
                                <Camera className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--label-secondary)]">
                            {formatDate(tx.date)} • Settled
                          </p>
                        </div>
                        <div className="max-w-[46%] min-w-0 text-right shrink-0">
                          <DynamicAmount
                            cents={tx.amountCents}
                            currencySymbol={settings.currencySymbol}
                            direction="settled"
                            swapRedGreen={settings.swapRedGreen}
                            prefix={tx.type === 'owed_to_me' ? '+' : '-'}
                            maxFontPx={14}
                            minFontPx={10}
                            className="font-semibold text-[var(--label-tertiary)] justify-end line-through"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Transaction Modal (Add / Edit) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setSelectedTx(null);
        }}
        personId={person.id}
        transaction={selectedTx}
        initialType={initialTxType}
      />

      {/* Settle Up Confirmation Alert */}
      <AnimatePresence>
        {showSettleConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-xs bg-[var(--bg-card)] rounded-2xl p-5 text-center shadow-2xl border border-[var(--separator)] space-y-4"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--label-primary)]">Settle All Balances?</h3>
                <p className="text-xs text-[var(--label-secondary)] mt-1">
                  This will record an offsetting transaction of{' '}
                  <span className="font-bold text-[var(--label-primary)]">
                    {formatCents(Math.abs(activeBalanceCents), settings.currencySymbol)}
                  </span>{' '}
                  to balance out this account to zero and archive these items into Settled History.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettleConfirm(false)}
                  className="py-2.5 rounded-xl bg-[var(--bg-grouped)] text-sm font-semibold text-[var(--label-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSettleUp}
                  className="py-2.5 rounded-xl bg-emerald-500 text-sm font-semibold text-white"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Image Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4"
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Receipt Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
