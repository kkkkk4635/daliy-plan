import { useEffect, useState } from 'react';
import { X, Repeat, Bell, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useScheduleStore, type NewPlanInput } from '../store/useScheduleStore';
import type { PlanItem, PlanType, TimeSlot, Recurrence, RecurrenceType, Reminder } from '../types';
import { PLAN_TYPE_META, TIME_SLOTS, slotFromTime } from '../types';
import { ymd, parseISO, WEEKDAY_CN } from '../utils/date';
import { BrutalButton } from './UI';

interface EditDrawerProps {
  open: boolean;
  initialDate?: Date;
  initialTime?: { start: Date; end: Date };
  editing?: PlanItem | null;
  onClose: () => void;
}

const TYPE_LIST: PlanType[] = ['meal', 'study', 'workout', 'other'];

export function EditDrawer({ open, initialDate, initialTime, editing, onClose }: EditDrawerProps) {
  const createPlan = useScheduleStore((s) => s.createPlan);
  const updatePlan = useScheduleStore((s) => s.updatePlan);
  const removePlan = useScheduleStore((s) => s.removePlan);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<PlanType>('study');
  const [slot, setSlot] = useState<TimeSlot>('morning');
  const [date, setDate] = useState(ymd(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [note, setNote] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(10);
  const [recType, setRecType] = useState<RecurrenceType>('none');
  const [recDays, setRecDays] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setType(editing.type);
      setSlot(editing.slot || slotFromTime(parseISO(editing.startTime).getHours()));
      const start = parseISO(editing.startTime);
      setDate(ymd(start));
      setStartTime(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
      const end = parseISO(editing.endTime);
      setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
      setNote(editing.note || '');
      setReminderEnabled(editing.reminder?.enabled || false);
      setReminderOffset(editing.reminder?.offsetMinutes ?? 10);
      setRecType(editing.recurrence?.type || 'none');
      setRecDays(editing.recurrence?.daysOfWeek || []);
    } else {
      setTitle('');
      setType('study');
      const d = initialDate || new Date();
      setDate(ymd(d));
      if (initialTime) {
        setStartTime(toHm(initialTime.start));
        setEndTime(toHm(initialTime.end));
        setSlot(slotFromTime(initialTime.start.getHours()));
      } else {
        setStartTime('09:00');
        setEndTime('10:00');
        setSlot(slotFromTime(9));
      }
      setNote('');
      setReminderEnabled(false);
      setReminderOffset(10);
      setRecType('none');
      setRecDays([]);
    }
  }, [open, editing, initialDate, initialTime]);

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
    const startDate = new Date(`${date}T${startTime}:00`);
    const endDate = new Date(`${date}T${endTime}:00`);
    if (endDate <= startDate) {
      endDate.setTime(startDate.getTime() + 30 * 60 * 1000);
    }
    const reminder: Reminder | undefined = reminderEnabled
      ? { enabled: true, offsetMinutes: reminderOffset }
      : undefined;
    let recurrence: Recurrence | undefined;
    if (recType !== 'none') {
      recurrence = { type: recType, daysOfWeek: recType === 'weekly' || recType === 'custom' ? recDays : undefined };
    }

    if (editing) {
      await updatePlan(editing.id, {
        title: t,
        type,
        slot,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        note: note.trim() || undefined,
        reminder,
        recurrence,
      });
    } else {
      const input: NewPlanInput = {
        title: t,
        type,
        category: 'routine',
        slot,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        note: note.trim() || undefined,
        reminder,
        recurrence,
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
              {editing ? 'edit' : 'new'}
            </div>
            <h2 className="font-display text-2xl font-bold">
              {editing ? '编辑计划' : '新建计划'}
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
              placeholder="例如:早餐 / 阅读《原则》/ 跑步 5 公里"
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

          {/* 时段分区 */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              时段分区
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((s) => {
                const active = slot === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setSlot(s.key);
                      // 自动填充该分区的默认时间
                      const defaults: Record<TimeSlot, [string, string]> = {
                        morning: ['07:00', '08:00'],
                        afternoon: ['14:00', '15:00'],
                        evening: ['19:00', '20:00'],
                      };
                      setStartTime(defaults[s.key][0]);
                      setEndTime(defaults[s.key][1]);
                    }}
                    className={clsx(
                      'flex flex-col items-center gap-1 py-2.5 border-2 border-[var(--ink)] rounded-md transition-all',
                      active ? 'bg-[var(--terracotta)] text-white shadow-brutal-sm' : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                    )}
                  >
                    <span className="text-lg">{s.emoji}</span>
                    <span className="text-xs font-semibold">{s.label}</span>
                    <span className="text-[10px] font-mono opacity-70">{s.range}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 日期 + 时间 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono text-sm focus:outline-none focus:shadow-brutal-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                开始
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono text-sm focus:outline-none focus:shadow-brutal-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                结束
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono text-sm focus:outline-none focus:shadow-brutal-sm"
              />
            </div>
          </div>

          {/* 重复规则 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              <Repeat size={12} />
              重复
            </label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { v: 'none', label: '不重复' },
                { v: 'daily', label: '每日' },
                { v: 'weekdays', label: '工作日' },
                { v: 'weekly', label: '每周' },
                { v: 'custom', label: '自定义' },
              ] as { v: RecurrenceType; label: string }[]).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => {
                    setRecType(opt.v);
                    if (opt.v === 'weekly' && recDays.length === 0) {
                      setRecDays([parseISO(`2000-01-0${1 + 1}`).getDay()]); // 周一
                    }
                  }}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-semibold border-2 border-[var(--ink)] rounded-md transition-all',
                    recType === opt.v
                      ? 'bg-[var(--terracotta)] text-white shadow-brutal-sm'
                      : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(recType === 'weekly' || recType === 'custom') && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WEEKDAY_CN.map((label, idx) => {
                  const active = recDays.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (active) setRecDays(recDays.filter((d) => d !== idx));
                        else setRecDays([...recDays, idx].sort());
                      }}
                      className={clsx(
                        'w-9 h-9 text-xs font-bold border-2 border-[var(--ink)] rounded-md transition-all',
                        active
                          ? 'bg-[var(--teal)] text-white shadow-brutal-sm'
                          : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                      )}
                    >
                      {label[1]}
                    </button>
                  );
                })}
              </div>
            )}
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
                启用浏览器通知提醒
              </label>
            </div>
            {reminderEnabled && (
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 30, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setReminderOffset(m)}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-mono font-semibold border-2 border-[var(--ink)] rounded-md transition-all',
                      reminderOffset === m
                        ? 'bg-[var(--sand)] text-[var(--ink)] shadow-brutal-sm'
                        : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                    )}
                  >
                    提前 {m} 分钟
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
            {editing ? '保存修改' : '创建计划'}
          </BrutalButton>
        </div>
      </div>
    </>
  );
}

function toHm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
