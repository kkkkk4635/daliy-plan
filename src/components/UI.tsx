import { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

interface BrutalCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function BrutalCard({ children, className, onClick, hoverable }: BrutalCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md',
        hoverable && 'transition-all duration-150 cursor-pointer hover:shadow-brutal',
        !hoverable && 'shadow-brutal-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

interface BrutalButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  title?: string;
}

export function BrutalButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  disabled,
  title,
}: BrutalButtonProps) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center gap-2 border-2 border-[var(--ink)] font-semibold tracking-wide',
        'transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'text-xs px-3 py-1.5',
        size === 'md' && 'text-sm px-4 py-2',
        size === 'lg' && 'text-base px-5 py-2.5',
        variant === 'primary' && 'bg-[var(--terracotta)] text-white shadow-brutal-sm hover:shadow-brutal-hover',
        variant === 'secondary' && 'bg-[var(--bg)] text-[var(--ink)] shadow-brutal-sm hover:shadow-brutal-hover',
        variant === 'ghost' && 'bg-transparent text-[var(--ink)] border-transparent shadow-none hover:bg-[var(--bg-soft)]',
        variant === 'danger' && 'bg-[var(--sand)] text-[var(--ink)] shadow-brutal-sm hover:shadow-brutal-hover',
        className
      )}
    >
      {children}
    </button>
  );
}

interface TagProps {
  color: 'meal-color' | 'study-color' | 'workout-color' | 'other-color' | 'ink' | 'terracotta' | 'teal';
  children: ReactNode;
  className?: string;
}

const colorMap: Record<TagProps['color'], string> = {
  'meal-color':    'text-meal-color',
  'study-color':   'text-study-color',
  'workout-color': 'text-workout-color',
  'other-color':   'text-other-color',
  'ink':           'text-[var(--ink)]',
  'terracotta':    'text-[var(--terracotta)]',
  'teal':          'text-[var(--teal)]',
};

export function Tag({ color, children, className }: TagProps) {
  return (
    <span className={clsx('ink-tag', colorMap[color], className)}>
      {children}
    </span>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[var(--ink)]/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] bg-[var(--bg)] border-l-2 border-[var(--ink)] shadow-brutal-lg overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 bg-[var(--bg)] border-b-2 border-[var(--ink)] px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">custom</div>
            <h2 className="font-display text-2xl font-bold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md hover:bg-[var(--bg-soft)] transition-colors"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </>
  );
}
