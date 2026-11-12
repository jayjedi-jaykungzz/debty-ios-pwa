import Dexie, { type Table } from 'dexie';
import { Person, Transaction, Tag, AppSettings, BackupData } from '../types/debty';
import { INITIAL_PEOPLE, INITIAL_SETTINGS, INITIAL_TAGS, INITIAL_TRANSACTIONS } from './seed';

export class DebtyDatabase extends Dexie {
  people!: Table<Person, string>;
  transactions!: Table<Transaction, string>;
  tags!: Table<Tag, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('debty_db');

    this.version(1).stores({
      people: 'id, name, isArchived, createdAt, updatedAt',
      transactions: 'id, personId, type, date, dueDate, isSettled, settledGroupId, createdAt',
      tags: 'id, name',
      settings: 'id',
    });
  }

  /**
   * Initializes the database with seed data only on true first launch (when settings is empty).
   * If a user intentionally deletes all contacts, refreshing does not resurrect demo contacts.
   */
  async initializeSeedIfEmpty(): Promise<void> {
    const settingsCount = await this.settings.count();

    if (settingsCount === 0) {
      await this.transaction('rw', this.people, this.transactions, this.tags, this.settings, async () => {
        await this.settings.put(INITIAL_SETTINGS);
        await this.tags.bulkPut(INITIAL_TAGS);
        await this.people.bulkPut(INITIAL_PEOPLE);
        await this.transactions.bulkPut(INITIAL_TRANSACTIONS);
      });
    }
  }

  /**
   * Reconciles settlements for a given person atomically:
   * 1. First validate existing settled groups (unbundling any group whose net cents is no longer 0).
   * 2. Then re-evaluate unsettled transactions and bundle them into a settled group if net sum is exactly 0.
   */
  async reconcilePersonSettlements(personId: string): Promise<void> {
    await this.transaction('rw', this.transactions, async () => {
      let personTxs = await this.transactions.where('personId').equals(personId).toArray();

      // 1. First validate existing settled groups for this person
      const settled = personTxs.filter((tx) => tx.isSettled && tx.settledGroupId);
      const groupsMap = new Map<string, Transaction[]>();
      for (const tx of settled) {
        if (!tx.settledGroupId) continue;
        const list = groupsMap.get(tx.settledGroupId) || [];
        list.push(tx);
        groupsMap.set(tx.settledGroupId, list);
      }

      let hadUnbundling = false;
      for (const [groupId, txList] of groupsMap.entries()) {
        let groupNet = 0;
        for (const tx of txList) {
          groupNet += tx.type === 'owed_to_me' ? tx.amountCents : -tx.amountCents;
        }

        // If a previously settled group no longer nets to zero, un-settle its members
        if (groupNet !== 0) {
          const unbundled = txList.map((tx) => ({
            ...tx,
            isSettled: false,
            settledGroupId: null,
          }));
          await this.transactions.bulkPut(unbundled);
          hadUnbundling = true;
        }
      }

      // Re-fetch transactions if unbundling occurred
      if (hadUnbundling) {
        personTxs = await this.transactions.where('personId').equals(personId).toArray();
      }

      // 2. Re-evaluate unsettled transactions
      const unsettled = personTxs.filter((tx) => !tx.isSettled);
      if (unsettled.length > 0) {
        let netCents = 0;
        for (const tx of unsettled) {
          netCents += tx.type === 'owed_to_me' ? tx.amountCents : -tx.amountCents;
        }

        // If net sum hits exactly zero, bundle all into a new settled history group
        if (netCents === 0) {
          const groupId = `sg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const updates = unsettled.map((tx) => ({
            ...tx,
            isSettled: true,
            settledGroupId: groupId,
          }));
          await this.transactions.bulkPut(updates);
        }
      }
    });
  }

  /**
   * Exports full database as BackupData object.
   */
  async exportBackup(): Promise<BackupData> {
    const [people, transactions, tags, settingsList] = await Promise.all([
      this.people.toArray(),
      this.transactions.toArray(),
      this.tags.toArray(),
      this.settings.toArray(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      people,
      transactions,
      tags,
      settings: settingsList[0] || INITIAL_SETTINGS,
    };
  }

  /**
   * Imports a backup JSON, replacing or merging all records atomically.
   */
  async importBackup(backup: BackupData): Promise<void> {
    if (!backup || !Array.isArray(backup.people) || !Array.isArray(backup.transactions)) {
      throw new Error('Invalid backup file structure.');
    }

    await this.transaction('rw', this.people, this.transactions, this.tags, this.settings, async () => {
      await this.people.clear();
      await this.transactions.clear();
      await this.tags.clear();
      await this.settings.clear();

      if (backup.people.length > 0) await this.people.bulkPut(backup.people);
      if (backup.transactions.length > 0) await this.transactions.bulkPut(backup.transactions);
      if (backup.tags && backup.tags.length > 0) await this.tags.bulkPut(backup.tags);
      if (backup.settings) await this.settings.put(backup.settings);
    });
  }

  /**
   * Resets database to initial seed dataset.
   */
  async resetToDemoData(): Promise<void> {
    await this.transaction('rw', this.people, this.transactions, this.tags, this.settings, async () => {
      await this.people.clear();
      await this.transactions.clear();
      await this.tags.clear();
      await this.settings.clear();

      await this.settings.put(INITIAL_SETTINGS);
      await this.tags.bulkPut(INITIAL_TAGS);
      await this.people.bulkPut(INITIAL_PEOPLE);
      await this.transactions.bulkPut(INITIAL_TRANSACTIONS);
    });
  }
}

export const db = new DebtyDatabase();
