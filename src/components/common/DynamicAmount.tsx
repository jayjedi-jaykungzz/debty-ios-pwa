import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { formatCents, formatSignedCents } from '../../utils/money';
import { getDebtVisuals } from '../../utils/colors';
import { TransactionType } from '../../types/debty';

interface DynamicAmountProps {
  cents: number;
  currencySymbol?: string;
  direction?: TransactionType | number | 'settled';
  swapRedGreen?: boolean;
  showSign?: boolean;
  prefix?: string;
  maxFontPx?: number;
  minFontPx?: number;
  maxFontSize?: number; // Backward-compatible alias
  minFontSize?: number; // Backward-compatible alias
  weightClass?: string;
  className?: string;
  style?: React.CSSProperties;
  forceDecimals?: boolean;
  colorOverride?: string; // Optional manual color class or hex
}

/**
 * DynamicAmount: Signature Debty Auto-Scaling Currency Component.
 *
 * Strict Engineering Rules:
 * 1. NEVER uses `truncate` or `...` (text-ellipsis).
 * 2. Employs `useLayoutEffect` and `ResizeObserver` to compare `textRef.scrollWidth`
 *    against `containerRef.clientWidth` and dynamically shrinks font size down to `minFontPx`
 *    so values like `฿99,999,999.99` never wrap or overflow narrow cards or list rows.
 * 3. Formats currency values strictly through integer cents arithmetic.
 */
export const DynamicAmount: React.FC<DynamicAmountProps> = ({
  cents,
  currencySymbol = '฿',
  direction,
  swapRedGreen = false,
  showSign = false,
  prefix,
  maxFontPx,
  minFontPx,
  maxFontSize,
  minFontSize,
  weightClass = 'font-semibold',
  className = '',
  style,
  forceDecimals = true,
  colorOverride,
}) => {
  const resolvedMaxPx = maxFontPx ?? maxFontSize ?? 28;
  const resolvedMinPx = minFontPx ?? minFontSize ?? 10;

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [currentFontPx, setCurrentFontPx] = useState<number>(resolvedMaxPx);

  // Formatted string
  let rawText = showSign
    ? formatSignedCents(cents, currencySymbol, forceDecimals)
    : formatCents(cents, currencySymbol, { forceDecimals });

  if (prefix) {
    rawText = `${prefix}${rawText}`;
  }

  const text = rawText;

  // Resolve color
  const visuals = direction !== undefined ? getDebtVisuals(direction, swapRedGreen) : null;
  const textColorClass = colorOverride ? colorOverride : visuals ? visuals.textColor : '';
  const resolvedTextColor = !colorOverride && !style?.color && visuals ? visuals.color : undefined;

  // Auto-fit algorithm
  const adjustFontSize = () => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    // Reset to max font size first to measure unconstrained width
    let low = resolvedMinPx;
    let high = resolvedMaxPx;
    let best = resolvedMinPx;

    textEl.style.fontSize = `${resolvedMaxPx}px`;
    if (textEl.scrollWidth <= availableWidth) {
      textEl.style.fontSize = `${resolvedMaxPx}px`;
      setCurrentFontPx(resolvedMaxPx);
      return;
    }

    // Binary search the optimal integer pixel font size
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      textEl.style.fontSize = `${mid}px`;
      if (textEl.scrollWidth <= availableWidth) {
        best = mid;
        low = mid + 1; // Try slightly larger
      } else {
        high = mid - 1; // Too big, reduce
      }
    }

    const finalPx = Math.max(resolvedMinPx, best);
    textEl.style.fontSize = `${finalPx}px`;
    setCurrentFontPx(finalPx);
  };

  useLayoutEffect(() => {
    adjustFontSize();
  }, [text, resolvedMaxPx, resolvedMinPx]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        adjustFontSize();
      });
      observer.observe(container);
      return () => observer.disconnect();
    }
  }, [text, resolvedMaxPx, resolvedMinPx]);

  return (
    <div
      ref={containerRef}
      className={`min-w-0 w-full overflow-hidden flex items-baseline ${className}`}
      style={{ minHeight: `${resolvedMinPx * 1.15}px` }}
    >
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap tabular-nums tracking-tight ${weightClass} ${textColorClass}`}
        style={{
          fontSize: `${currentFontPx}px`,
          lineHeight: 1.15,
          color: resolvedTextColor,
          ...style,
        }}
      >
        {text}
      </span>
    </div>
  );
};
