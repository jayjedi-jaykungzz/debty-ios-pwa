import { TransactionType } from '../types/debty';

export interface DebtVisuals {
  isPositive: boolean;      // True if conceptually "good" (they owe you in default mode)
  color: string;           // #34C759 or #FF3B30 or #8E8E93 (alias for hexColor)
  hexColor: string;        // #34C759 or #FF3B30 or #8E8E93
  textColor: string;       // Tailwind text class or hex style
  bgColor: string;         // Soft badge fill background
  borderColor: string;     // Border color for cards or badges
  label: string;           // "Owed to you" / "You owe" / "Settled"
  shortLabel: string;      // "Owes you" / "You owe" / "Settled"
}

/**
 * Centralized debt visual resolver for Debty.
 * Follows the strict swapRedGreen setting matrix:
 *
 * swapRedGreen === false (Default):
 * - owed_to_me / balance > 0  => GREEN (#34C759)
 * - i_owe / balance < 0       => RED (#FF3B30)
 *
 * swapRedGreen === true (Swapped):
 * - owed_to_me / balance > 0  => RED (#FF3B30)
 * - i_owe / balance < 0       => GREEN (#34C759)
 *
 * Zero / Settled:
 * - balance === 0             => Neutral Secondary (#8E8E93)
 */
export function getDebtVisuals(
  input: TransactionType | number | 'settled',
  swapRedGreen: boolean = false
): DebtVisuals {
  let direction: 'owed_to_me' | 'i_owe' | 'settled';

  if (typeof input === 'number') {
    if (input > 0) {
      direction = 'owed_to_me';
    } else if (input < 0) {
      direction = 'i_owe';
    } else {
      direction = 'settled';
    }
  } else {
    direction = input;
  }

  if (direction === 'settled') {
    return {
      isPositive: true,
      color: '#8E8E93',
      hexColor: '#8E8E93',
      textColor: 'text-ios-text-secondary',
      bgColor: 'rgba(142, 142, 147, 0.12)',
      borderColor: 'rgba(142, 142, 147, 0.25)',
      label: 'Settled Up',
      shortLabel: 'Settled',
    };
  }

  // Determine whether this direction is assigned Green or Red
  // By default: owed_to_me is Green, i_owe is Red
  const isGreen = swapRedGreen ? direction === 'i_owe' : direction === 'owed_to_me';

  if (isGreen) {
    return {
      isPositive: direction === 'owed_to_me',
      color: '#34C759',
      hexColor: '#34C759',
      textColor: 'text-ios-green',
      bgColor: 'rgba(52, 199, 89, 0.14)',
      borderColor: 'rgba(52, 199, 89, 0.28)',
      label: direction === 'owed_to_me' ? 'Owed to you' : 'You owe',
      shortLabel: direction === 'owed_to_me' ? 'Owes you' : 'You owe',
    };
  } else {
    return {
      isPositive: direction === 'owed_to_me',
      color: '#FF3B30',
      hexColor: '#FF3B30',
      textColor: 'text-ios-red',
      bgColor: 'rgba(255, 59, 48, 0.14)',
      borderColor: 'rgba(255, 59, 48, 0.28)',
      label: direction === 'owed_to_me' ? 'Owed to you' : 'You owe',
      shortLabel: direction === 'owed_to_me' ? 'Owes you' : 'You owe',
    };
  }
}

/**
 * Standard iOS Avatar Palettes
 */
export const IOS_AVATAR_PALETTE: { id: string; name: string; hex: string; gradient: string }[] = [
  { id: 'blue', name: 'Blue', hex: '#007AFF', gradient: 'from-[#007AFF] to-[#0A84FF]' },
  { id: 'purple', name: 'Purple', hex: '#AF52DE', gradient: 'from-[#AF52DE] to-[#BF5AF2]' },
  { id: 'pink', name: 'Pink', hex: '#FF2D55', gradient: 'from-[#FF2D55] to-[#FF375F]' },
  { id: 'red', name: 'Red', hex: '#FF3B30', gradient: 'from-[#FF3B30] to-[#FF453A]' },
  { id: 'orange', name: 'Orange', hex: '#FF9500', gradient: 'from-[#FF9500] to-[#FF9F0A]' },
  { id: 'amber', name: 'Amber', hex: '#FFCC00', gradient: 'from-[#FFCC00] to-[#FFD60A]' },
  { id: 'green', name: 'Green', hex: '#34C759', gradient: 'from-[#34C759] to-[#30D158]' },
  { id: 'teal', name: 'Teal', hex: '#30B0C7', gradient: 'from-[#30B0C7] to-[#40C8E0]' },
  { id: 'indigo', name: 'Indigo', hex: '#5856D6', gradient: 'from-[#5856D6] to-[#5E5CE6]' },
  { id: 'gray', name: 'Slate', hex: '#8E8E93', gradient: 'from-[#8E8E93] to-[#636366]' },
];

/**
 * Standard iOS Tag Color Palettes
 */
export const IOS_TAG_PALETTE: { id: string; name: string; hex: string }[] = [
  { id: 'blue', name: 'Blue', hex: '#007AFF' },
  { id: 'purple', name: 'Purple', hex: '#AF52DE' },
  { id: 'pink', name: 'Pink', hex: '#FF2D55' },
  { id: 'orange', name: 'Orange', hex: '#FF9500' },
  { id: 'green', name: 'Green', hex: '#34C759' },
  { id: 'teal', name: 'Teal', hex: '#30B0C7' },
  { id: 'indigo', name: 'Indigo', hex: '#5856D6' },
  { id: 'gray', name: 'Gray', hex: '#8E8E93' },
];
