import React from 'react';

interface AvatarProps {
  name: string;
  avatarColor?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarColor,
  color,
  size = 'md',
  className = '',
}) => {
  const resolvedColor = avatarColor || color || '#007AFF';

  // Extract up to 2 uppercase initials
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || '?';

  const sizeStyles = {
    sm: 'w-8 h-8 text-xs font-semibold',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-14 h-14 text-lg font-bold',
    xl: 'w-[72px] h-[72px] text-2xl font-bold',
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center rounded-full shrink-0 text-white shadow-sm select-none ${sizeStyles} ${className}`}
      style={{
        backgroundColor: resolvedColor,
      }}
    >
      <span className="leading-none drop-shadow-sm">{initials}</span>
      {/* Subtle iOS specular inner ring */}
      <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
    </div>
  );
};
