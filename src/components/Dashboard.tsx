import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Settings as SettingsIcon,
  Search,
  X,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  Archive,
  ArchiveRestore,
  AlertCircle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { useDebty } from '../context/DebtyContext';
import { Person, SortByOption, Tag } from '../types/debty';
import { getDashboardTotals, getPersonStats } from '../utils/money';
import { getDebtVisuals } from '../utils/colors';
import { DynamicAmount } from './common/DynamicAmount';
import { Avatar } from './common/Avatar';

interface DashboardProps {
  onOpenAddPerson: () => void;
  onOpenSettings: () => void;
  onSelectPerson: (personId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenAddPerson,
  onOpenSettings,
  onSelectPerson,
}) => {
  const { people, transactions, tags, settings, updateSettings, archivePerson } = useDebty();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [showSortMenu, setShowSortMenu] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track scroll position to transition iOS Large Title into inline title
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const scrollTop = scrollContainerRef.current.scrollTop;
    setIsScrolled(scrollTop > 44);
  };

  // Compute dashboard-level financial totals
  const totals = useMemo(() => {
    return getDashboardTotals(people, transactions);
  }, [people, transactions]);

  // Compute stats for all people
  const allPeopleWithStats = useMemo(() => {
    return people.map((p) => getPersonStats(p, transactions));
  }, [people, transactions]);

  // Separate active vs archived
  const activePeople = useMemo(() => {
    return allPeopleWithStats.filter((p) => !p.isArchived);
  }, [allPeopleWithStats]);

  const archivedPeople = useMemo(() => {
    return allPeopleWithStats.filter((p) => p.isArchived);
  }, [allPeopleWithStats]);

  // Filter & Sort active people
  const filteredActivePeople = useMemo(() => {
    let result = [...activePeople];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagIds.some((tid) => {
            const tagObj = tags.find((t) => t.id === tid);
            return tagObj && tagObj.name.toLowerCase().includes(q);
          })
      );
    }

    // Tag filter
    if (selectedTagId) {
      result = result.filter((p) => p.tagIds.includes(selectedTagId));
    }

    // Sort order
    result.sort((a, b) => {
      if (settings.sortBy === 'debt_total') {
        return Math.abs(b.activeBalanceCents) - Math.abs(a.activeBalanceCents);
      }
      if (settings.sortBy === 'recent') {
        const dateA = a.latestTransactionDate || a.createdAt;
        const dateB = b.latestTransactionDate || b.createdAt;
        return dateB.localeCompare(dateA);
      }
      if (settings.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [activePeople, searchQuery, selectedTagId, settings.sortBy, tags]);

  // Visuals for Net Balance
  const netVisuals = getDebtVisuals(totals.netBalanceCents, settings.swapRedGreen);

  const sortOptions: { id: SortByOption; label: string }[] = [
    { id: 'debt_total', label: 'Highest Debt' },
    { id: 'recent', label: 'Recent Activity' },
    { id: 'name', label: 'Name (A–Z)' },
  ];

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="relative h-full w-full overflow-y-auto no-scrollbar touch-momentum bg-ios-bg-grouped"
    >
      {/* Sticky iOS Top Navigation Bar with Blurred Translucency */}
      <div
        className={`sticky top-0 z-30 transition-all duration-200 border-b ${
          isScrolled
            ? 'bg-ios-bg-grouped/80 backdrop-blur-xl border-ios-separator shadow-sm'
            : 'bg-transparent border-transparent'
        } pt-safe`}
      >
        <div className="flex items-center justify-between px-4 h-12">
          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 -ml-2 rounded-full text-ios-blue hover:opacity-80 active:scale-95 transition-transform"
            aria-label="Settings"
          >
            <SettingsIcon className="w-6 h-6 stroke-[2]" />
          </button>

          {/* Inline Centered Title (revealed on scroll) */}
          <div
            className={`transition-opacity duration-200 text-center ${
              isScrolled ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <h1 className="text-[17px] font-semibold text-ios-text-primary leading-tight">Debty</h1>
          </div>

          {/* Add Person Button */}
          <button
            type="button"
            onClick={onOpenAddPerson}
            className="p-2 -mr-2 rounded-full text-ios-blue hover:opacity-80 active:scale-95 transition-transform"
            aria-label="Add Person"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-28 pt-1 space-y-5 max-w-2xl mx-auto">
        {/* iOS Collapsing Large Title */}
        <div className="pt-1">
          <h1 className="text-[34px] font-bold tracking-tight text-ios-text-primary leading-none">
            Debty
          </h1>
          <p className="text-[13px] text-ios-text-secondary mt-1 font-medium">
            {totals.activePeopleCount} active {totals.activePeopleCount === 1 ? 'contact' : 'contacts'}
          </p>
        </div>

        {/* Top Summary Card */}
        <div className="rounded-[22px] bg-ios-bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/5 dark:border-white/5 space-y-4">
          {/* Net Balance Row */}
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-ios-text-secondary">
              Net Balance
            </span>
            <div className="w-full max-w-xs">
              <DynamicAmount
                cents={totals.netBalanceCents}
                currencySymbol={settings.currencySymbol}
                direction={totals.netBalanceCents}
                swapRedGreen={settings.swapRedGreen}
                showSign={true}
                maxFontPx={38}
                minFontPx={18}
                weightClass="font-bold text-center justify-center"
              />
            </div>
            <span className="text-[11px] font-medium text-ios-text-secondary">
              {totals.netBalanceCents > 0
                ? 'Overall you are owed money'
                : totals.netBalanceCents < 0
                ? 'Overall you owe money'
                : 'All debts currently balanced'}
            </span>
          </div>

          <div className="h-px bg-ios-separator w-full" />

          {/* 2-Column Split: Owed to you / You owe */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left: Owed to you */}
            <div className="rounded-xl bg-ios-bg-tertiary/60 p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ios-text-secondary">
                Owed to you
              </span>
              <div className="mt-1">
                <DynamicAmount
                  cents={totals.totalOwedToMeCents}
                  currencySymbol={settings.currencySymbol}
                  direction="owed_to_me"
                  swapRedGreen={settings.swapRedGreen}
                  maxFontPx={20}
                  minFontPx={12}
                  weightClass="font-bold"
                />
              </div>
            </div>

            {/* Right: You owe */}
            <div className="rounded-xl bg-ios-bg-tertiary/60 p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ios-text-secondary">
                You owe
              </span>
              <div className="mt-1">
                <DynamicAmount
                  cents={totals.totalIOweCents}
                  currencySymbol={settings.currencySymbol}
                  direction="i_owe"
                  swapRedGreen={settings.swapRedGreen}
                  maxFontPx={20}
                  minFontPx={12}
                  weightClass="font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar & Sort Button */}
        <div className="flex items-center space-x-2">
          {/* iOS Search Field */}
          <div className="relative flex-1 rounded-2xl bg-ios-bg-tertiary px-3.5 py-2 flex items-center space-x-2">
            <Search className="w-4 h-4 text-ios-text-secondary shrink-0" />
            <input
              type="text"
              placeholder="Search contacts or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-base font-normal text-ios-text-primary placeholder:text-ios-text-secondary focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full text-ios-text-secondary hover:text-ios-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Switcher Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="p-2.5 rounded-2xl bg-ios-bg-tertiary text-ios-text-primary flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Sort"
            >
              <ArrowUpDown className="w-5 h-5 text-ios-blue" />
            </button>

            {/* Sort Popover Menu */}
            <AnimatePresence>
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 mt-2 z-50 w-44 rounded-2xl bg-ios-bg-card p-1 shadow-2xl border border-ios-separator"
                  >
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          updateSettings({ sortBy: opt.id });
                          setShowSortMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-between ${
                          settings.sortBy === opt.id
                            ? 'bg-ios-blue text-white'
                            : 'text-ios-text-primary hover:bg-ios-bg-tertiary'
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Horizontal Tag Filter Chips */}
        {tags.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 touch-momentum">
            <button
              type="button"
              onClick={() => setSelectedTagId(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                selectedTagId === null
                  ? 'bg-ios-text-primary text-ios-bg-card shadow-sm'
                  : 'bg-ios-bg-card text-ios-text-secondary border border-ios-separator'
              }`}
            >
              All
            </button>
            {tags.map((tag) => {
              const isSelected = selectedTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTagId(isSelected ? null : tag.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-ios-blue text-white shadow-sm'
                      : 'bg-ios-bg-card text-ios-text-primary border border-ios-separator'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#FFFFFF' : tag.color }}
                  />
                  <span>{tag.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Inset Grouped People List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ios-text-secondary">
              People ({filteredActivePeople.length})
            </h2>
            <span className="text-[11px] text-ios-text-secondary font-medium">
              Sorted by {sortOptions.find((s) => s.id === settings.sortBy)?.label}
            </span>
          </div>

          {filteredActivePeople.length === 0 ? (
            <div className="rounded-[22px] bg-ios-bg-card p-8 text-center space-y-3 border border-black/5 dark:border-white/5">
              <div className="w-12 h-12 rounded-full bg-ios-bg-tertiary flex items-center justify-center mx-auto text-ios-text-secondary">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-ios-text-primary">No contacts found</p>
              <p className="text-xs text-ios-text-secondary max-w-xs mx-auto">
                {searchQuery || selectedTagId
                  ? 'Try clearing your search query or tag filter.'
                  : 'Tap "+" at the top right to add your first debtor or creditor!'}
              </p>
            </div>
          ) : (
            <div className="rounded-[22px] bg-ios-bg-card overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/5 dark:border-white/5 divide-y divide-ios-separator">
              {filteredActivePeople.map((person) => {
                const personTags = tags.filter((t) => person.tagIds.includes(t.id));

                return (
                  <div
                    key={person.id}
                    onClick={() => onSelectPerson(person.id)}
                    className="group flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:bg-black/[0.04] dark:active:bg-white/[0.04] transition-colors cursor-pointer select-none"
                  >
                    {/* Left: Avatar + Details */}
                    <div className="flex items-center space-x-3.5 min-w-0 flex-1 mr-3">
                      <Avatar name={person.name} avatarColor={person.avatarColor} size="md" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[16px] font-semibold text-ios-text-primary truncate">
                            {person.name}
                          </span>

                          {/* Overdue Badge */}
                          {person.hasOverdue && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-ios-red/15 text-ios-red shrink-0">
                              <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                              Overdue
                            </span>
                          )}

                          {/* Due Soon Badge */}
                          {!person.hasOverdue && person.hasDueSoon && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-ios-orange/15 text-ios-orange shrink-0">
                              <Clock className="w-2.5 h-2.5 mr-0.5" />
                              Due soon
                            </span>
                          )}
                        </div>

                        {/* Tag Chips or Subtle Meta */}
                        <div className="flex items-center space-x-1.5 mt-0.5 overflow-hidden">
                          {personTags.length > 0 ? (
                            personTags.slice(0, 2).map((t) => (
                              <span
                                key={t.id}
                                className="inline-flex items-center text-[11px] font-medium text-ios-text-secondary"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full mr-1 shrink-0"
                                  style={{ backgroundColor: t.color }}
                                />
                                {t.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-ios-text-secondary">
                              {person.activeTransactionCount}{' '}
                              {person.activeTransactionCount === 1 ? 'entry' : 'entries'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Net Balance via DynamicAmount + Quick Archive + Chevron */}
                    <div className="flex items-center space-x-2 shrink-0 max-w-[160px]">
                      <div className="text-right flex-1 min-w-0">
                        <DynamicAmount
                          cents={person.activeBalanceCents}
                          currencySymbol={settings.currencySymbol}
                          direction={person.activeBalanceCents}
                          swapRedGreen={settings.swapRedGreen}
                          showSign={person.activeBalanceCents !== 0}
                          maxFontPx={17}
                          minFontPx={12}
                          weightClass="font-bold"
                          className="justify-end"
                        />
                        <span className="text-[10px] uppercase font-bold text-ios-text-secondary tracking-wider block">
                          {person.activeBalanceCents > 0
                            ? 'Owes you'
                            : person.activeBalanceCents < 0
                            ? 'You owe'
                            : 'Settled'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          archivePerson(person.id, true);
                        }}
                        className="p-1 rounded-full text-ios-text-secondary hover:text-ios-blue active:scale-95 transition-all opacity-65 hover:opacity-100"
                        title="Archive Contact"
                        aria-label={`Archive ${person.name}`}
                      >
                        <Archive className="w-4 h-4" />
                      </button>

                      <ChevronRight className="w-4 h-4 text-ios-text-secondary/60 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collapsible Archived People Accordion */}
        {archivedPeople.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-ios-bg-card shadow-sm border border-black/5 dark:border-white/5 text-ios-text-secondary hover:text-ios-text-primary active:opacity-70 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Archive className="w-4 h-4 text-ios-orange" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Archived People ({archivedPeople.length})
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isArchivedExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {isArchivedExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-2 rounded-2xl bg-ios-bg-card border border-black/5 dark:border-white/5 divide-y divide-ios-separator"
                >
                  {archivedPeople.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div
                        onClick={() => onSelectPerson(person.id)}
                        className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <Avatar name={person.name} avatarColor={person.avatarColor} size="sm" />
                        <div className="truncate">
                          <p className="text-sm font-semibold text-ios-text-primary truncate">
                            {person.name}
                          </p>
                          <span className="text-[11px] text-ios-text-secondary">Archived contact</span>
                        </div>
                      </div>

                      {/* Unarchive Quick Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          archivePerson(person.id, false);
                        }}
                        className="ml-3 px-3 py-1.5 rounded-xl bg-ios-bg-tertiary text-ios-blue text-xs font-semibold hover:bg-ios-blue hover:text-white transition-colors flex items-center space-x-1"
                        aria-label="Unarchive contact"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>Unarchive</span>
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
