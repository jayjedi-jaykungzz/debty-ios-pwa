import React from 'react';
import { motion } from 'framer-motion';

interface IOSSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  label?: string;
}

export const IOSSwitch: React.FC<IOSSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  ariaLabel,
  label,
}) => {
  const effectiveAriaLabel = ariaLabel || label || 'Toggle setting';

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={effectiveAriaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full p-[2px] transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue ${
        checked ? 'bg-[#34C759]' : 'bg-[#E5E5EA] dark:bg-[#39393D]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:opacity-85'}`}
    >
      <motion.span
        layout
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 32,
        }}
        className={`pointer-events-none block h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.18),0_1px_1px_rgba(0,0,0,0.06)] ${
          checked ? 'ml-[20px]' : 'ml-0'
        }`}
      />
    </button>
  );
};
