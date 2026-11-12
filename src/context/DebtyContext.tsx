import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Person, Transaction, Tag, AppSettings, BackupData } from '../types/debty';
import { db } from '../db/db';
import { INITIAL_SETTINGS } from '../db/seed';
import { getPersonActiveBalanceCents } from '../utils/money';
import { getTodayISO } from '../utils/dates';

interface DebtyContextValue {
  people: Person[];
  transactions: Transaction[];
  tags: Tag[];
  settings: AppSettings;
  isLoading: boolean;
  refreshData: () => Promise<void>;

  // Person CRUD
  addPerson: (data: { name: string; avatarColor: string; tagIds: string[] }) => Promise<Person>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  archivePerson: (id: string, isArchived: boolean) => Promise<void>;

  // Transaction CRUD
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'isSettled' | 'settledGroupId'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  settleUpPerson: (personId: string, customComment?: string) => Promise<void>;

  // Tag CRUD
  addTag: (data: { name: string; color: string }) => Promise<Tag>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;

  // Settings & System
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  exportBackup: () => Promise<BackupData>;
  importBackup: (backup: BackupData) => Promise<void>;
  resetDemoData: () => Promise<void>;
}

const DebtyContext = createContext<DebtyContextValue | null>(null);

export const DebtyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load all entities from Dexie
  const refreshData = useCallback(async () => {
    try {
      await db.initializeSeedIfEmpty();
      const [peopleList, txList, tagsList, settingsList] = await Promise.all([
        db.people.toArray(),
        db.transactions.toArray(),
        db.tags.toArray(),
        db.settings.toArray(),
      ]);

      setPeople(peopleList);
      setTransactions(txList);
      setTags(tagsList);
      if (settingsList.length > 0 && settingsList[0]) {
        setSettings(settingsList[0]);
      }
    } catch (err) {
      console.error('Failed to load Debty database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Synchronize iOS theme and theme-color meta tag
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const meta = document.getElementById('theme-color-meta');
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark);

      if (isDark) {
        root.classList.add('dark');
        if (meta) meta.setAttribute('content', '#000000');
      } else {
        root.classList.remove('dark');
        if (meta) meta.setAttribute('content', '#F2F2F7');
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (settings.theme === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [settings.theme]);

  // --------------------------------------------------------------------------
  // Person Mutations
  // --------------------------------------------------------------------------
  const addPerson = useCallback(
    async (data: { name: string; avatarColor: string; tagIds: string[] }): Promise<Person> => {
      const now = new Date().toISOString();
      const newPerson: Person = {
        id: `person_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: data.name.trim(),
        avatarColor: data.avatarColor,
        tagIds: data.tagIds,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };

      await db.people.put(newPerson);
      await refreshData();
      return newPerson;
    },
    [refreshData]
  );

  const updatePerson = useCallback(
    async (id: string, updates: Partial<Person>): Promise<void> => {
      const existing = await db.people.get(id);
      if (!existing) return;

      const updated: Person = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await db.people.put(updated);
      await refreshData();
    },
    [refreshData]
  );

  const deletePerson = useCallback(
    async (id: string): Promise<void> => {
      await db.transaction('rw', db.people, db.transactions, async () => {
        await db.people.delete(id);
        const related = await db.transactions.where('personId').equals(id).toArray();
        const ids = related.map((t) => t.id);
        if (ids.length > 0) {
          await db.transactions.bulkDelete(ids);
        }
      });
      await refreshData();
    },
    [refreshData]
  );

  const archivePerson = useCallback(
    async (id: string, isArchived: boolean): Promise<void> => {
      await updatePerson(id, { isArchived });
    },
    [updatePerson]
  );

  // --------------------------------------------------------------------------
  // Transaction Mutations
  // --------------------------------------------------------------------------
  const addTransaction = useCallback(
    async (data: Omit<Transaction, 'id' | 'createdAt' | 'isSettled' | 'settledGroupId'>): Promise<Transaction> => {
      const now = new Date().toISOString();
      const newTx: Transaction = {
        ...data,
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        isSettled: false,
        settledGroupId: null,
        createdAt: now,
      };

      await db.transactions.put(newTx);
      await db.reconcilePersonSettlements(newTx.personId);
      await refreshData();
      return newTx;
    },
    [refreshData]
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>): Promise<void> => {
      const existing = await db.transactions.get(id);
      if (!existing) return;

      const updated: Transaction = {
        ...existing,
        ...updates,
      };

      await db.transactions.put(updated);
      await db.reconcilePersonSettlements(updated.personId);
      await refreshData();
    },
    [refreshData]
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      const existing = await db.transactions.get(id);
      if (!existing) return;

      await db.transactions.delete(id);
      await db.reconcilePersonSettlements(existing.personId);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * Settle Up Person: Creates an offsetting transaction entry that brings the active balance to 0,
   * then Dexie reconcilePersonSettlements folds all active items into a new settled history group.
   */
  const settleUpPerson = useCallback(
    async (personId: string, customComment?: string): Promise<void> => {
      const currentBalance = getPersonActiveBalanceCents(personId, transactions);
      if (currentBalance === 0) return;

      // If positive (they owe me), offset with i_owe. If negative (I owe them), offset with owed_to_me.
      const offsetType = currentBalance > 0 ? 'i_owe' : 'owed_to_me';
      const offsetAmountCents = Math.abs(currentBalance);
      const commentText = customComment?.trim() || 'Settled Up';

      const now = new Date().toISOString();
      const settleTx: Transaction = {
        id: `tx_settle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        personId,
        amountCents: offsetAmountCents,
        type: offsetType,
        comment: commentText,
        date: getTodayISO(),
        dueDate: null,
        receiptImageBase64: null,
        isSettled: false,
        settledGroupId: null,
        isSettlementEntry: true,
        createdAt: now,
      };

      await db.transactions.put(settleTx);
      await db.reconcilePersonSettlements(personId);
      await refreshData();
    },
    [transactions, refreshData]
  );

  // --------------------------------------------------------------------------
  // Tag Mutations
  // --------------------------------------------------------------------------
  const addTag = useCallback(
    async (data: { name: string; color: string }): Promise<Tag> => {
      const newTag: Tag = {
        id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: data.name.trim(),
        color: data.color,
      };
      await db.tags.put(newTag);
      await refreshData();
      return newTag;
    },
    [refreshData]
  );

  const updateTag = useCallback(
    async (id: string, updates: Partial<Tag>): Promise<void> => {
      const existing = await db.tags.get(id);
      if (!existing) return;
      await db.tags.put({ ...existing, ...updates });
      await refreshData();
    },
    [refreshData]
  );

  const deleteTag = useCallback(
    async (id: string): Promise<void> => {
      await db.transaction('rw', db.tags, db.people, async () => {
        await db.tags.delete(id);
        // Remove tag from people referencing it
        const peopleList = await db.people.toArray();
        for (const p of peopleList) {
          if (p.tagIds.includes(id)) {
            await db.people.put({
              ...p,
              tagIds: p.tagIds.filter((t) => t !== id),
            });
          }
        }
      });
      await refreshData();
    },
    [refreshData]
  );

  // --------------------------------------------------------------------------
  // Settings & System
  // --------------------------------------------------------------------------
  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>): Promise<void> => {
      const updated = { ...settings, ...updates, id: 'default' as const };
      await db.settings.put(updated);
      setSettings(updated);
    },
    [settings]
  );

  const exportBackup = useCallback(async (): Promise<BackupData> => {
    return await db.exportBackup();
  }, []);

  const importBackup = useCallback(
    async (backup: BackupData): Promise<void> => {
      await db.importBackup(backup);
      await refreshData();
    },
    [refreshData]
  );

  const resetDemoData = useCallback(async (): Promise<void> => {
    await db.resetToDemoData();
    await refreshData();
  }, [refreshData]);

  const value = useMemo(
    () => ({
      people,
      transactions,
      tags,
      settings,
      isLoading,
      refreshData,
      addPerson,
      updatePerson,
      deletePerson,
      archivePerson,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      settleUpPerson,
      addTag,
      updateTag,
      deleteTag,
      updateSettings,
      exportBackup,
      importBackup,
      resetDemoData,
    }),
    [
      people,
      transactions,
      tags,
      settings,
      isLoading,
      refreshData,
      addPerson,
      updatePerson,
      deletePerson,
      archivePerson,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      settleUpPerson,
      addTag,
      updateTag,
      deleteTag,
      updateSettings,
      exportBackup,
      importBackup,
      resetDemoData,
    ]
  );

  return <DebtyContext.Provider value={value}>{children}</DebtyContext.Provider>;
};

export function useDebty(): DebtyContextValue {
  const context = useContext(DebtyContext);
  if (!context) {
    throw new Error('useDebty must be used within a DebtyProvider');
  }
  return context;
}
