'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { RoleType } from '@/types';

interface RoleSwitcherProps {
  role: RoleType;
  onRoleChange: (role: RoleType) => void;
  className?: string;
}

export default function RoleSwitcher({ role, onRoleChange, className }: RoleSwitcherProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-border bg-muted p-1',
        className,
      )}
    >
      <button
        onClick={() => onRoleChange('founder')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200',
          role === 'founder'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span className="text-base">🏢</span>
        Founder
      </button>
      <button
        onClick={() => onRoleChange('employee')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200',
          role === 'employee'
            ? 'bg-somnia-500 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span className="text-base">👤</span>
        Employee
      </button>
    </div>
  );
}
