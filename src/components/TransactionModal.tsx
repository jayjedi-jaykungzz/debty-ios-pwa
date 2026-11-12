import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Camera, Calendar, Clock, AlertCircle, Check, Eye } from 'lucide-react';
import { Transaction, TransactionType } from '../types/debty';
import { useDebty } from '../context/DebtyContext';
import { evaluateMathExpression, MathParserResult } from '../utils/mathParser';
import { compressReceiptImage } from '../utils/imageCompressor';
import { getDebtVisuals } from '../utils/colors';
import { formatCents } from '../utils/money';
import { getDueDateStatus, getDueDateLabel, getTodayISO } from '../utils/dates';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  transaction?: Transaction | null;
  initialType?: TransactionType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  personId,
  transaction,
  initialType = 'owed_to_me',
}) => {
  const { addTransaction, updateTransaction, deleteTransaction, settings } = useDebty();

  const [type, setType] = useState<TransactionType>(initialType);
  const [expression, setExpression] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayISO());
  const [dueDate, setDueDate] = useState<string>('');
  const [receiptImageBase64, setReceiptImageBase64] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [attemptedSaveWithIncomplete, setAttemptedSaveWithIncomplete] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState<boolean>(false);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or transaction prop changes
  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setType(transaction.type);
        const wholeUnits = Math.floor(transaction.amountCents / 100);
        const subUnits = transaction.amountCents % 100;
        setExpression(
          subUnits === 0 ? `${wholeUnits}` : `${wholeUnits}.${subUnits.toString().padStart(2, '0')}`
        );
        setComment(transaction.comment || '');
        setDate(transaction.date || getTodayISO());
        setDueDate(transaction.dueDate || '');
        setReceiptImageBase64(transaction.receiptImageBase64 || undefined);
      } else {
        setType(initialType);
        setExpression('');
        setComment('');
        setDate(getTodayISO());
        setDueDate('');
        setReceiptImageBase64(undefined);
      }
      setAttemptedSaveWithIncomplete(false);
      setShowDeleteConfirm(false);
      setShowPhotoLightbox(false);

      // Auto-focus amount input after bottom sheet animation finishes
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, transaction, initialType]);

  const mathResult: MathParserResult = evaluateMathExpression(expression);
  const visuals = getDebtVisuals(type, settings.swapRedGreen);

  const dueDateStatus = dueDate ? getDueDateStatus(dueDate, false) : null;
  const dueDateLabel = dueDate ? getDueDateLabel(dueDate, false) : null;

  const handleOperatorClick = (op: string) => {
    if (op === 'BACKSPACE') {
      setExpression((prev) => prev.slice(0, -1));
    } else {
      setExpression((prev) => prev + op);
    }
    setAttemptedSaveWithIncomplete(false);
    amountInputRef.current?.focus();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressReceiptImage(file, 1200, 0.72);
      setReceiptImageBase64(compressedDataUrl);
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('Unable to compress this image. Please try another image.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setReceiptImageBase64(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mathResult.status === 'incomplete') {
      setAttemptedSaveWithIncomplete(true);
      return;
    }

    if (mathResult.status === 'invalid' || mathResult.cents <= 0) {
      return;
    }

    if (transaction) {
      await updateTransaction(transaction.id, {
        type,
        amountCents: mathResult.cents,
        comment: comment.trim(),
        date,
        dueDate: dueDate || undefined,
        receiptImageBase64: receiptImageBase64 || undefined,
      });
    } else {
      await addTransaction({
        personId,
        type,
        amountCents: mathResult.cents,
        comment: comment.trim(),
        date,
        dueDate: dueDate || undefined,
        receiptImageBase64: receiptImageBase64 || undefined,
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!transaction) return;
    await deleteTransaction(transaction.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
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

          {/* Bottom Sheet Card */}
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

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--separator)]">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--label-secondary)] active:scale-95 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold text-[var(--label-primary)]">
                {transaction ? 'Edit Transaction' : 'New Transaction'}
              </h2>
              {transaction ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 active:scale-95 transition-transform"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-8" />
              )}
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 pb-safe space-y-4">
              {/* Segmented Control: Direction */}
              <div className="grid grid-cols-2 p-1 bg-[var(--bg-card)] rounded-2xl border border-[var(--separator)] shadow-sm">
                <button
                  type="button"
                  onClick={() => setType('owed_to_me')}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    type === 'owed_to_me'
                      ? 'shadow-sm text-white'
                      : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)]'
                  }`}
                  style={{
                    backgroundColor: type === 'owed_to_me' ? visuals.color : 'transparent',
                  }}
                >
                  They owe me
                </button>
                <button
                  type="button"
                  onClick={() => setType('i_owe')}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    type === 'i_owe'
                      ? 'shadow-sm text-white'
                      : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)]'
                  }`}
                  style={{
                    backgroundColor:
                      type === 'i_owe'
                        ? getDebtVisuals('i_owe', settings.swapRedGreen).color
                        : 'transparent',
                  }}
                >
                  I owe them
                </button>
              </div>

              {/* Amount & Math Expression Card */}
              <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--separator)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
                    Amount ({settings.currencySymbol})
                  </span>
                  {mathResult.hasOperators && (
                    <span className="text-xs font-medium text-[var(--ios-blue)]">
                      Math Mode Active
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <span
                    className="text-2xl font-bold mr-2 select-none"
                    style={{ color: visuals.color }}
                  >
                    {settings.currencySymbol}
                  </span>
                  <input
                    ref={amountInputRef}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="0"
                    value={expression}
                    onChange={(e) => {
                      setExpression(e.target.value);
                      setAttemptedSaveWithIncomplete(false);
                    }}
                    className="w-full text-3xl font-bold bg-transparent text-[var(--label-primary)] tabular-nums outline-none placeholder:text-[var(--label-tertiary)]"
                    style={{ fontSize: 'max(24px, 1.5rem)' }}
                  />
                  {expression.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpression('');
                        amountInputRef.current?.focus();
                      }}
                      className="p-1 rounded-full text-[var(--label-tertiary)] hover:text-[var(--label-primary)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Tactile Quick Math Operator Bar */}
                <div className="pt-1 border-t border-[var(--separator)]">
                  <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {[
                      { label: '+', value: '+' },
                      { label: '-', value: '-' },
                      { label: '×', value: '×' },
                      { label: '÷', value: '÷' },
                      { label: '(', value: '(' },
                      { label: ')', value: ')' },
                      { label: '⌫', value: 'BACKSPACE' },
                    ].map((op) => (
                      <button
                        key={op.label}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleOperatorClick(op.value);
                        }}
                        className="flex-1 min-w-[38px] h-9 flex items-center justify-center rounded-xl bg-[var(--bg-grouped)] active:bg-gray-200 dark:active:bg-gray-700 text-base font-semibold text-[var(--label-primary)] shadow-sm active:scale-95 transition-transform"
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Calculation Feedback */}
                {mathResult.status === 'valid' && mathResult.hasOperators && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold tabular-nums">
                    <span>Evaluates to:</span>
                    <span>{formatCents(mathResult.cents, settings.currencySymbol)}</span>
                  </div>
                )}

                {((expression.trim().length > 0 && mathResult.status === 'incomplete') ||
                  attemptedSaveWithIncomplete) && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      {attemptedSaveWithIncomplete
                        ? 'Finish typing your calculation before saving.'
                        : 'Expression in progress (e.g. 100 + 45)...'}
                    </span>
                  </div>
                )}

                {mathResult.status === 'invalid' && expression.trim().length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{mathResult.errorMessage || 'Invalid math expression'}</span>
                  </div>
                )}
              </div>

              {/* Grouped Card 1: Comment, Date, Due Date */}
              <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--separator)] shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)] mb-1.5">
                    Note / Description
                  </label>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Lunch, trip split, groceries..."
                    className="w-full text-base bg-[var(--bg-grouped)] border border-[var(--separator)] rounded-xl p-3 text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none focus:ring-2 focus:ring-[var(--ios-blue)] resize-none"
                    style={{ fontSize: 'max(16px, 1rem)' }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--separator)]">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)] mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full text-base bg-[var(--bg-grouped)] border border-[var(--separator)] rounded-xl p-2.5 text-[var(--label-primary)] outline-none focus:ring-2 focus:ring-[var(--ios-blue)]"
                      style={{ fontSize: 'max(16px, 1rem)' }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Due Date (Optional)</span>
                      </label>
                      {dueDate && (
                        <button
                          type="button"
                          onClick={() => setDueDate('')}
                          className="text-xs text-[var(--ios-blue)] font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full text-base bg-[var(--bg-grouped)] border border-[var(--separator)] rounded-xl p-2.5 text-[var(--label-primary)] outline-none focus:ring-2 focus:ring-[var(--ios-blue)]"
                      style={{ fontSize: 'max(16px, 1rem)' }}
                    />
                    {dueDateStatus && dueDateLabel && (
                      <div
                        className={`mt-1.5 text-xs font-semibold flex items-center gap-1 ${
                          dueDateStatus === 'overdue'
                            ? 'text-red-500'
                            : dueDateStatus === 'due_today' || dueDateStatus === 'due_soon'
                            ? 'text-amber-500'
                            : 'text-[var(--label-secondary)]'
                        }`}
                      >
                        <AlertCircle className="w-3 h-3" />
                        <span>{dueDateLabel}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Grouped Card 2: Receipt / Slip Photo (Strict Hitbox Separation with mt-5) */}
              <div className="mt-5 bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--separator)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[var(--label-secondary)]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
                      Receipt / Slip Photo
                    </span>
                  </div>
                  {receiptImageBase64 && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-xs font-medium text-red-500 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {receiptImageBase64 ? (
                  <div className="flex items-center gap-3 p-2 bg-[var(--bg-grouped)] rounded-xl border border-[var(--separator)]">
                    <img
                      src={receiptImageBase64}
                      alt="Receipt preview"
                      className="w-16 h-16 object-cover rounded-lg border border-[var(--separator)] cursor-pointer"
                      onClick={() => setShowPhotoLightbox(true)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--label-primary)] truncate">
                        Receipt attached
                      </p>
                      <p className="text-xs text-[var(--label-secondary)]">
                        Compressed & ready
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPhotoLightbox(true)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] text-xs font-semibold text-[var(--ios-blue)] border border-[var(--separator)] flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="w-full py-3.5 border-2 border-dashed border-[var(--separator)] rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-[var(--ios-blue)] active:bg-[var(--bg-grouped)] transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isCompressing ? 'Compressing receipt...' : 'Attach Slip / Receipt'}</span>
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={mathResult.status !== 'valid' || mathResult.cents <= 0}
                  className={`w-full py-3.5 rounded-2xl text-base font-semibold text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                    mathResult.status === 'valid' && mathResult.cents > 0
                      ? 'bg-[var(--ios-blue)] opacity-100'
                      : 'bg-gray-400 dark:bg-gray-700 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  <span>
                    {transaction ? 'Save Changes' : 'Add Transaction'}
                    {mathResult.status === 'valid' && mathResult.cents > 0 && (
                      <span className="ml-1 opacity-90 tabular-nums">
                        ({formatCents(mathResult.cents, settings.currencySymbol)})
                      </span>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>

          {/* Full Screen Photo Lightbox */}
          <AnimatePresence>
            {showPhotoLightbox && receiptImageBase64 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4"
              >
                <div className="absolute top-4 right-4 z-10">
                  <button
                    type="button"
                    onClick={() => setShowPhotoLightbox(false)}
                    className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <img
                  src={receiptImageBase64}
                  alt="Receipt Full View"
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Alert */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="w-full max-w-xs bg-[var(--bg-card)] rounded-2xl p-5 text-center shadow-2xl border border-[var(--separator)] space-y-4"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--label-primary)]">
                      Delete Transaction?
                    </h3>
                    <p className="text-xs text-[var(--label-secondary)] mt-1">
                      This transaction will be permanently removed. Your net balance will update automatically.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="py-2.5 rounded-xl bg-[var(--bg-grouped)] text-sm font-semibold text-[var(--label-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};
