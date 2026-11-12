import { Person, Transaction, Tag, AppSettings } from '../types/debty';
import { getTodayISO, parseISODate } from '../utils/dates';

function getOffsetDate(daysOffset: number): string {
  const today = parseISODate(getTodayISO());
  const target = new Date(today);
  target.setDate(target.getDate() + daysOffset);
  const year = target.getFullYear();
  const month = (target.getMonth() + 1).toString().padStart(2, '0');
  const day = target.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INITIAL_SETTINGS: AppSettings = {
  id: 'default',
  currencySymbol: '฿',
  theme: 'system',
  swapRedGreen: false,
  sortBy: 'debt_total',
};

export const INITIAL_TAGS: Tag[] = [
  { id: 'tag_friends', name: 'Friends', color: '#007AFF' },
  { id: 'tag_work', name: 'Work', color: '#AF52DE' },
  { id: 'tag_trip', name: 'Japan Trip', color: '#FF9500' },
  { id: 'tag_family', name: 'Family', color: '#34C759' },
  { id: 'tag_dinner', name: 'Dining', color: '#FF2D55' },
];

export const INITIAL_PEOPLE: Person[] = [
  {
    id: 'person_sarah',
    name: 'Sarah Jenkins',
    avatarColor: '#007AFF', // Blue
    tagIds: ['tag_friends', 'tag_trip'],
    isArchived: false,
    createdAt: getOffsetDate(-30) + 'T10:00:00.000Z',
    updatedAt: getOffsetDate(-2) + 'T14:30:00.000Z',
  },
  {
    id: 'person_alex',
    name: 'Alex Rivera',
    avatarColor: '#AF52DE', // Purple
    tagIds: ['tag_work'],
    isArchived: false,
    createdAt: getOffsetDate(-25) + 'T09:15:00.000Z',
    updatedAt: getOffsetDate(-5) + 'T11:20:00.000Z',
  },
  {
    id: 'person_michael',
    name: 'Michael Chen',
    avatarColor: '#FF9500', // Orange
    tagIds: ['tag_friends', 'tag_dinner'],
    isArchived: false,
    createdAt: getOffsetDate(-20) + 'T16:00:00.000Z',
    updatedAt: getOffsetDate(-1) + 'T18:00:00.000Z',
  },
  {
    id: 'person_emily',
    name: 'Emily Watson',
    avatarColor: '#34C759', // Green
    tagIds: ['tag_family'],
    isArchived: false,
    createdAt: getOffsetDate(-45) + 'T08:00:00.000Z',
    updatedAt: getOffsetDate(-3) + 'T12:00:00.000Z',
  },
  {
    id: 'person_david',
    name: 'David Kim',
    avatarColor: '#FF2D55', // Pink
    tagIds: ['tag_work', 'tag_trip'],
    isArchived: false,
    createdAt: getOffsetDate(-15) + 'T11:00:00.000Z',
    updatedAt: getOffsetDate(-7) + 'T15:00:00.000Z',
  },
  {
    id: 'person_lisa_archived',
    name: 'Lisa Ray',
    avatarColor: '#8E8E93', // Gray
    tagIds: ['tag_friends'],
    isArchived: true,
    createdAt: getOffsetDate(-60) + 'T10:00:00.000Z',
    updatedAt: getOffsetDate(-20) + 'T09:00:00.000Z',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Sarah Jenkins (Net: +฿3,500.00 owed to me, with 1 active debt + historical settled group)
  {
    id: 'tx_sarah_1',
    personId: 'person_sarah',
    amountCents: 350000, // ฿3,500.00
    type: 'owed_to_me',
    comment: 'Tokyo Shinkansen Bullet Train tickets',
    date: getOffsetDate(-8),
    dueDate: getOffsetDate(2), // Due soon in 2 days
    receiptImageBase64: null,
    isSettled: false,
    settledGroupId: null,
    createdAt: getOffsetDate(-8) + 'T14:00:00.000Z',
  },
  // Sarah's Settled History Group (Group 1: Dinner split ฿800 - paid back ฿800 = 0)
  {
    id: 'tx_sarah_settled_1',
    personId: 'person_sarah',
    amountCents: 80000, // ฿800.00
    type: 'owed_to_me',
    comment: 'Omakase Sushi Dinner split',
    date: getOffsetDate(-25),
    dueDate: null,
    receiptImageBase64: null,
    isSettled: true,
    settledGroupId: 'sg_sarah_trip_dinner',
    createdAt: getOffsetDate(-25) + 'T20:30:00.000Z',
  },
  {
    id: 'tx_sarah_settled_2',
    personId: 'person_sarah',
    amountCents: 80000, // ฿800.00
    type: 'i_owe',
    comment: 'PromptPay transfer for sushi (Settled Up)',
    date: getOffsetDate(-23),
    dueDate: null,
    receiptImageBase64: null,
    isSettled: true,
    settledGroupId: 'sg_sarah_trip_dinner',
    isSettlementEntry: true,
    createdAt: getOffsetDate(-23) + 'T10:15:00.000Z',
  },

  // Alex Rivera (Net: -฿1,250.00 - I owe Alex, overdue by 2 days)
  {
    id: 'tx_alex_1',
    personId: 'person_alex',
    amountCents: 125000, // ฿1,250.00
    type: 'i_owe',
    comment: 'Team Lunch BBQ & Drinks advance',
    date: getOffsetDate(-10),
    dueDate: getOffsetDate(-2), // Overdue!
    receiptImageBase64: null,
    isSettled: false,
    settledGroupId: null,
    createdAt: getOffsetDate(-10) + 'T13:45:00.000Z',
  },

  // Michael Chen (Net: +฿450.00 owed to me, due today)
  {
    id: 'tx_michael_1',
    personId: 'person_michael',
    amountCents: 45000, // ฿450.00
    type: 'owed_to_me',
    comment: 'Craft Beer & Nachos',
    date: getOffsetDate(-3),
    dueDate: getTodayISO(), // Due today!
    receiptImageBase64: null,
    isSettled: false,
    settledGroupId: null,
    createdAt: getOffsetDate(-3) + 'T21:10:00.000Z',
  },

  // Emily Watson (Net: +฿2,100.00 owed to me)
  {
    id: 'tx_emily_1',
    personId: 'person_emily',
    amountCents: 210000, // ฿2,100.00
    type: 'owed_to_me',
    comment: 'Mom birthday gift chip-in',
    date: getOffsetDate(-12),
    dueDate: getOffsetDate(10), // Upcoming
    receiptImageBase64: null,
    isSettled: false,
    settledGroupId: null,
    createdAt: getOffsetDate(-12) + 'T16:20:00.000Z',
  },

  // David Kim (Net: -฿600.00 I owe David)
  {
    id: 'tx_david_1',
    personId: 'person_david',
    amountCents: 60000, // ฿600.00
    type: 'i_owe',
    comment: 'Concert parking ticket & highway toll',
    date: getOffsetDate(-7),
    dueDate: null,
    receiptImageBase64: null,
    isSettled: false,
    settledGroupId: null,
    createdAt: getOffsetDate(-7) + 'T22:00:00.000Z',
  },

  // Lisa Ray (Archived contact with historical settled transaction)
  {
    id: 'tx_lisa_1',
    personId: 'person_lisa_archived',
    amountCents: 150000,
    type: 'owed_to_me',
    comment: 'IKEA bookshelf purchase',
    date: getOffsetDate(-50),
    dueDate: null,
    receiptImageBase64: null,
    isSettled: true,
    settledGroupId: 'sg_lisa_old',
    createdAt: getOffsetDate(-50) + 'T14:00:00.000Z',
  },
  {
    id: 'tx_lisa_2',
    personId: 'person_lisa_archived',
    amountCents: 150000,
    type: 'i_owe',
    comment: 'Cash payback at office',
    date: getOffsetDate(-48),
    dueDate: null,
    receiptImageBase64: null,
    isSettled: true,
    settledGroupId: 'sg_lisa_old',
    isSettlementEntry: true,
    createdAt: getOffsetDate(-48) + 'T15:30:00.000Z',
  },
];
