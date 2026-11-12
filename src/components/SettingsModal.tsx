import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Palette,
  DollarSign,
  Tag as TagIcon,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronRight,
  Sun,
  Moon,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { useDebty } from '../context/DebtyContext';
import { IOSSwitch } from './common/IOSSwitch';
import { IOS_TAG_PALETTE, getDebtVisuals } from '../utils/colors';
import { Tag, BackupData } from '../types/debty';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORTED_CURRENCIES = [
  { symbol: '฿', code: 'THB', name: 'Thai Baht' },
  { symbol: '$', code: 'USD', name: 'US Dollar' },
  { symbol: '€', code: 'EUR', name: 'Euro' },
  { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
  { symbol: '£', code: 'GBP', name: 'British Pound' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    updateSettings,
    tags,
    addTag,
    updateTag,
    deleteTag,
    exportBackup,
    importBackup,
    resetDemoData,
  } = useDebty();

  // Local state for adding tag
  const [newTagName, setNewTagName] = useState<string>('');
  const [newTagColor, setNewTagColor] = useState<string>(IOS_TAG_PALETTE[0].hex);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  // Status feedback banners
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Reset confirmation dialog
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    await addTag({
      name: trimmed,
      color: newTagColor,
    });

    setNewTagName('');
    setNewTagColor(IOS_TAG_PALETTE[(tags.length + 1) % IOS_TAG_PALETTE.length].hex);
    showFeedback('success', `Tag "${trimmed}" added!`);
  };

  const handleExportBackup = async () => {
    try {
      const data: BackupData = await exportBackup();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;

      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('download', `debty-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showFeedback('success', 'Backup exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      showFeedback('error', 'Failed to export backup data.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate basic schema structure
        if (!parsed || !Array.isArray(parsed.people) || !Array.isArray(parsed.transactions)) {
          showFeedback('error', 'Invalid backup file format. Missing core records.');
          return;
        }

        await importBackup(parsed as BackupData);
        showFeedback('success', 'Data imported successfully!');
      } catch (err) {
        console.error('Import parse error:', err);
        showFeedback('error', 'Failed to import. Corrupted JSON file.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const handleConfirmReset = async () => {
    try {
      await resetDemoData();
      setShowResetConfirm(false);
      showFeedback('success', 'Demo data restored successfully!');
    } catch (err) {
      console.error('Reset error:', err);
      showFeedback('error', 'Failed to reset demo data.');
    }
  };

  if (!isOpen) return null;

  // Visuals for live swapRedGreen preview
  const owedVisuals = getDebtVisuals('owed_to_me', settings.swapRedGreen);
  const oweVisuals = getDebtVisuals('i_owe', settings.swapRedGreen);

  return (
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

        {/* Inset Grouped Sheet Modal */}
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

          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--separator)]">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--label-secondary)] active:scale-95 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold text-[var(--label-primary)]">Settings</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-[var(--ios-blue)] active:opacity-60"
            >
              Done
            </button>
          </div>

          {/* Scrollable Grouped Settings List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe space-y-6">
            {/* Feedback Banner */}
            <AnimatePresence>
              {feedbackMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm ${
                    feedbackMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}
                >
                  {feedbackMessage.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedbackMessage.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Group 1: Appearance & Colors */}
            <div className="space-y-1.5">
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
                Appearance & Colors
              </span>
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--separator)] shadow-sm divide-y divide-[var(--separator)] overflow-hidden">
                {/* Theme Selector */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Palette className="w-4 h-4 text-[var(--ios-blue)]" />
                    <span className="text-sm font-semibold text-[var(--label-primary)]">Theme</span>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-[var(--bg-grouped)] rounded-xl border border-[var(--separator)]">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'system', label: 'Auto', icon: Smartphone },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isSelected = settings.theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => updateSettings({ theme: t.id as any })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                            isSelected
                              ? 'bg-[var(--bg-card)] text-[var(--ios-blue)] shadow-sm'
                              : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)]'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Swap Red and Green Switch */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="pr-4">
                    <span className="text-sm font-semibold text-[var(--label-primary)] block">
                      Swap Red & Green
                    </span>
                    <span className="text-xs text-[var(--label-secondary)] block mt-0.5">
                      Flip colors for positive (owed to you) vs negative (you owe)
                    </span>
                  </div>
                  <IOSSwitch
                    checked={settings.swapRedGreen}
                    onChange={(checked) => updateSettings({ swapRedGreen: checked })}
                    label="Swap Red and Green"
                  />
                </div>

                {/* Live Color Preview Row */}
                <div className="p-3 bg-[var(--bg-grouped)]/50 flex items-center justify-between">
                  <span className="text-xs text-[var(--label-secondary)] font-medium">Live Color Preview:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: owedVisuals.color }}
                    >
                      They owe you (+100)
                    </span>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: oweVisuals.color }}
                    >
                      You owe (-100)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Group 2: Currency */}
            <div className="space-y-1.5">
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
                Default Currency
              </span>
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--separator)] shadow-sm divide-y divide-[var(--separator)] overflow-hidden">
                {SUPPORTED_CURRENCIES.map((curr) => {
                  const isSelected = settings.currencySymbol === curr.symbol;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => updateSettings({ currencySymbol: curr.symbol })}
                      className="w-full p-3.5 flex items-center justify-between text-left active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[var(--bg-grouped)] flex items-center justify-center font-bold text-sm text-[var(--label-primary)] border border-[var(--separator)]">
                          {curr.symbol}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--label-primary)]">{curr.name}</p>
                          <p className="text-xs text-[var(--label-secondary)]">{curr.code}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-[var(--ios-blue)]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 3: Manage Tags */}
            <div className="space-y-1.5">
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
                Manage Tags ({tags.length})
              </span>
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--separator)] shadow-sm p-4 space-y-4">
                {/* Add New Tag Row */}
                <form onSubmit={handleAddTag} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="New tag name (e.g. Vacation, Roommates)..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="flex-1 text-base bg-[var(--bg-grouped)] border border-[var(--separator)] rounded-xl px-3 py-2 text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)] outline-none focus:ring-2 focus:ring-[var(--ios-blue)]"
                      style={{ fontSize: 'max(16px, 1rem)' }}
                    />
                    <button
                      type="submit"
                      disabled={!newTagName.trim()}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-1 shadow-sm active:scale-95 transition-all ${
                        newTagName.trim()
                          ? 'bg-[var(--ios-blue)]'
                          : 'bg-gray-400 dark:bg-gray-700 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Color Swatch Picker */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <span className="text-xs text-[var(--label-secondary)] shrink-0">Color:</span>
                    {IOS_TAG_PALETTE.map((swatch) => (
                      <button
                        key={swatch.id}
                        type="button"
                        onClick={() => setNewTagColor(swatch.hex)}
                        className={`w-6 h-6 rounded-full shrink-0 transition-transform ${
                          newTagColor === swatch.hex ? 'scale-125 ring-2 ring-offset-2 ring-[var(--ios-blue)]' : ''
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    ))}
                  </div>
                </form>

                {/* Existing Tags List */}
                <div className="pt-2 border-t border-[var(--separator)] divide-y divide-[var(--separator)]">
                  {tags.map((tag) => (
                    <div key={tag.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Tappable color dot cycles to next palette color */}
                        <button
                          type="button"
                          onClick={() => {
                            const currentIdx = IOS_TAG_PALETTE.findIndex((p) => p.hex === tag.color);
                            const nextColor =
                              IOS_TAG_PALETTE[(currentIdx + 1) % IOS_TAG_PALETTE.length].hex;
                            updateTag(tag.id, { color: nextColor });
                          }}
                          className="w-5 h-5 rounded-full shrink-0 shadow-sm active:scale-90 transition-transform"
                          style={{ backgroundColor: tag.color }}
                          title="Tap to cycle color"
                        />

                        {editingTagId === tag.id ? (
                          <input
                            type="text"
                            defaultValue={tag.name}
                            autoFocus
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val) updateTag(tag.id, { name: val });
                              setEditingTagId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="flex-1 text-base bg-[var(--bg-grouped)] border border-[var(--separator)] rounded-lg px-2 py-1 text-[var(--label-primary)] outline-none"
                            style={{ fontSize: 'max(16px, 1rem)' }}
                          />
                        ) : (
                          <span
                            onClick={() => setEditingTagId(tag.id)}
                            className="text-sm font-semibold text-[var(--label-primary)] truncate cursor-pointer hover:underline"
                          >
                            {tag.name}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteTag(tag.id)}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete tag"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Group 4: Data Backup & Restore */}
            <div className="space-y-1.5">
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--label-secondary)]">
                Data & Storage
              </span>
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--separator)] shadow-sm divide-y divide-[var(--separator)] overflow-hidden">
                {/* Export Data */}
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full p-3.5 flex items-center justify-between text-left active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] flex items-center justify-center">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--label-primary)]">
                        Export Backup (.json)
                      </p>
                      <p className="text-xs text-[var(--label-secondary)]">
                        Download all contacts, transactions & tags
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--label-tertiary)]" />
                </button>

                {/* Import Data */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-3.5 flex items-center justify-between text-left active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--label-primary)]">
                          Import Backup (.json)
                        </p>
                        <p className="text-xs text-[var(--label-secondary)]">
                          Restore data from a previously saved JSON file
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--label-tertiary)]" />
                  </button>
                </div>

                {/* Reset Demo Data */}
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full p-3.5 flex items-center justify-between text-left active:bg-gray-100 dark:active:bg-gray-800 transition-colors text-red-500"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Reset Demo Data</p>
                      <p className="text-xs opacity-80">Restore default sample contacts and debts</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </button>
              </div>
            </div>

            {/* Footer Attribution */}
            <div className="pt-2 text-center text-xs text-[var(--label-tertiary)] space-y-1">
              <p className="font-semibold">Debty v1.0.0 • iOS Offline-First Standalone PWA</p>
              <p className="text-[11px]">
                100% Private. All calculations computed locally in IndexedDB integer cents.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Reset Confirmation Dialog */}
        <AnimatePresence>
          {showResetConfirm && (
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-xs bg-[var(--bg-card)] rounded-2xl p-5 text-center shadow-2xl border border-[var(--separator)] space-y-4"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--label-primary)]">
                    Reset to Demo Data?
                  </h3>
                  <p className="text-xs text-[var(--label-secondary)] mt-1">
                    This will replace your current contacts and transactions with the default sample data.
                    Consider exporting a backup first.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="py-2.5 rounded-xl bg-[var(--bg-grouped)] text-sm font-semibold text-[var(--label-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white"
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
