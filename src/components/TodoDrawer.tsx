import { useEffect, useState } from 'react';
import { X, Bell, Trash2, CalendarClock, Flag } from 'lucide-react';
import clsx from 'clsx';
import { useScheduleStore, type NewPlanInput } from '../store/useScheduleStore';
import type { PlanItem, PlanType, TodoPriority, Reminder } from '../types';
import { PLAN_TYPE_META, PRIORITY_META, slotFromTime } from '../types';
import { ymd, parseISO } from '../utils/date';
import { BrutalButton } from './UI';

interface TodoDrawerProps {
  open: boolean;
  editing?: PlanItem | null;
  onClose: () => void;
}

const TYPE_LIST: PlanType[] = ['meal', 'study', 'workout', 'other'];

// 提醒预设：截止前多少分钟
const REMINDER_PRESETS: { label: string; minutes: number }[] = [
  { label: '截止前 1 小时', minutes: 60 },
  { label: '截止前 3 小时', minutes: 180 },
  { label: '截止前 24 小时', minutes: 60 * 24 },
  { label: '截止前 2 天', minutes: 60 * 24 * 2 },
  { label: '截止前 7 天', minutes: 60 * 24 * 7 },
  { label: '截止时', minutes: 0 },
];

export function TodoDrawer({ open, editing, onClose }: TodoDrawerProps) {
  const createPlan = useScheduleStore((s) => s.createPlan);
  const updatePlan = useScheduleStore((s) => s.updatePlan);
  const removePlan = useScheduleStore((s) => s.removePlan);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<PlanType>('other');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  // 截止时间：日期 + 时间
  const [deadlineDate, setDeadlineDate] = useState(ymd(new Date()));
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(60); // 截止前 1 小时
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setType(editing.type);
      setPriority(editing.priority || 'medium');
      const end = parseISO(editing.endTime);
      setDeadlineDate(ymd(end));
      setDeadlineTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
      setReminderEnabled(editing.reminder?.enabled || false);
      setReminderOffset(editing.reminder?.offsetMinutes ?? 60);
      setNote(editing.note || '');
    } else {
      setTitle('');
      setType('other');
      setPriority('medium');
      // 默认截止时间：明天 23:59
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDeadlineDate(ymd(tomorrow));
      setDeadlineTime('23:59');
      setReminderEnabled(false);
      setReminderOffset(60);
      setNote('');
    }
  }, [open, editing]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  const handleSave = async () => {
    const t = title.trim();
    if (!t) return;

    const deadline = new Date(`${deadlineDate}T${deadlineTime}:00`);
    const now = new Date();
    // startTime = 创建时间, endTime = 截止时间
    const startTime = editing ? editing.startTime : now.toISOString();
    const endTime = deadline.toISOString();

    const reminder: Reminder | undefined = reminderEnabled
      ? { enabled: true, offsetMinutes: reminderOffset }
      : undefined;

    if (editing) {
      await updatePlan(editing.id, {
        title: t,
        type,
        priority,
        endTime,
        note: note.trim() || undefined,
        reminder,
      });
    } else {
      const input: NewPlanInput = {
        title: t,
        type,
        category: 'todo',
        priority,
        slot: slotFromTime(deadline.getHours()),
        startTime,
        endTime,
        note: note.trim() || undefined,
        reminder,
      };
      await createPlan(input);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`确定删除「${editing.title}」?`)) return;
    await removePlan(editing.id);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-[var(--ink)]/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      {/* 抽屉 */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] bg-[var(--bg)] border-l-2 border-[var(--ink)] shadow-brutal-lg overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 bg-[var(--bg)] border-b-2 border-[var(--ink)] px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
              {editing ? 'edit todo' : 'new todo'}
            </div>
            <h2 className="font-display text-2xl font-bold">
              {editing ? '编辑待办' : '新建待办'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md hover:bg-[var(--bg-soft)] transition-colors"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 标题 */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              标题
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：交报告 / 回复邮件 / 买东西"
              className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] text-[var(--ink)] font-medium focus:outline-none focus:shadow-brutal-sm"
              autoFocus
            />
          </div>

          {/* 类型 */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              类型
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_LIST.map((t) => {
                const meta = PLAN_TYPE_META[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={clsx(
                      'flex flex-col items-center gap-1 py-2.5 border-2 border-[var(--ink)] rounded-md transition-all',
                      active ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm' : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                    )}
                  >
                    <span className="text-lg">{meta.emoji}</span>
                    <span className="text-xs font-semibold">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 优先级 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              <Flag size={12} />
              优先级
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as TodoPriority[]).map((p) => {
                const meta = PRIORITY_META[p];
                const active = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={clsx(
                      'flex items-center justify-center gap-1.5 py-2.5 border-2 border-[var(--ink)] rounded-md transition-all',
                      active ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm' : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                    )}
                  >
                    <span className="text-sm">{meta.emoji}</span>
                    <span className="text-sm font-semibold">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 截止时间 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              <CalendarClock size={12} />
              截止时间
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono text-sm focus:outline-none focus:shadow-brutal-sm"
              />
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono text-sm focus:outline-none focus:shadow-brutal-sm"
              />
            </div>
          </div>

          {/* 提醒 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              <Bell size={12} />
              提醒
            </label>
            <div className="flex items-center gap-2 mb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="brutal-checkbox"
                />
                启用截止前提醒
              </label>
            </div>
            {reminderEnabled && (
              <div className="grid grid-cols-2 gap-1.5">
                {REMINDER_PRESETS.map((preset) => (
                  <button
                    key={preset.minutes}
                    onClick={() => setReminderOffset(preset.minutes)}
                    className={clsx(
                      'px-3 py-2 text-xs font-mono font-semibold border-2 border-[var(--ink)] rounded-md transition-all',
                      reminderOffset === preset.minutes
                        ? 'bg-[var(--sand)] text-[var(--ink)] shadow-brutal-sm'
                        : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              备注
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="任何你想记住的细节..."
              className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] text-sm focus:outline-none focus:shadow-brutal-sm resize-none"
            />
          </div>
        </div>

        {/* 底部操作 */}
        <div className="sticky bottom-0 bg-[var(--bg)] border-t-2 border-[var(--ink)] px-6 py-4 flex items-center gap-2">
          {editing && (
            <BrutalButton variant="danger" onClick={handleDelete} className="mr-auto">
              <Trash2 size={14} />
              删除
            </BrutalButton>
          )}
          <BrutalButton variant="secondary" onClick={onClose}>
            取消
          </BrutalButton>
          <BrutalButton variant="primary" onClick={handleSave}>
            {editing ? '保存修改' : '创建待办'}
          </BrutalButton>
        </div>
      </div>
    </>
  );
}
