import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ToastItem {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}

let listeners: ((items: ToastItem[]) => void)[] = [];
let counter = 0;

export function toast(message: string, kind: ToastItem['kind'] = 'info') {
  const id = ++counter;
  const item: ToastItem = { id, message, kind };
  listeners.forEach((l) => l((globalThis as { __toasts?: ToastItem[] }).__toasts ? [...((globalThis as { __toasts?: ToastItem[] }).__toasts || []), item] : [item]));
  (globalThis as { __toasts?: ToastItem[] }).__toasts = [
    ...((globalThis as { __toasts?: ToastItem[] }).__toasts || []),
    item,
  ];
  setTimeout(() => {
    (globalThis as { __toasts?: ToastItem[] }).__toasts = (
      (globalThis as { __toasts?: ToastItem[] }).__toasts || []
    ).filter((t) => t.id !== id);
    listeners.forEach((l) => l((globalThis as { __toasts?: ToastItem[] }).__toasts || []));
  }, 3000);
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const l = (next: ToastItem[]) => setItems(next);
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto border-2 border-[var(--ink)] shadow-brutal-sm rounded-md px-4 py-2.5',
            'flex items-center gap-2 text-sm font-medium animate-pop-in',
            t.kind === 'success' && 'bg-[var(--teal)] text-white',
            t.kind === 'error' && 'bg-[var(--terracotta)] text-white',
            t.kind === 'info' && 'bg-[var(--bg)] text-[var(--ink)]'
          )}
        >
          <span>{t.message}</span>
          <button
            onClick={() => {
              (globalThis as { __toasts?: ToastItem[] }).__toasts = (
                (globalThis as { __toasts?: ToastItem[] }).__toasts || []
              ).filter((x) => x.id !== t.id);
              listeners.forEach((l) => l((globalThis as { __toasts?: ToastItem[] }).__toasts || []));
            }}
            className="opacity-70 hover:opacity-100"
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
