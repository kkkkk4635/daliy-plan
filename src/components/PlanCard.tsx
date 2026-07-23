import { useState } from 'react';
import clsx from 'clsx';
import { Bell, Repeat, Trash2, Edit3, ChevronDown } from 'lucide-react';
import type { PlanItem, PlanType } from '../types';
import { PLAN_TYPE_META } from '../types';
import { hm, isPlanCompletedOnDate, planDurationMinutes } from '../utils/date';

interface PlanCardProps {
  plan: PlanItem;
  date: Date;
  onToggle: (id: string, date: string) => void;
  onEdit: (plan: PlanItem) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
  showDate?: boolean;
}

const colorBg: Record<PlanType, string> = {
  meal:    'bg-meal-color/10 border-meal-color/40',
  study:   'bg-study-color/10 border-study-color/40',
  workout: 'bg-workout-color/10 border-workout-color/40',
  other:   'bg-other-color/10 border-other-color/40',
};
const colorAccent: Record<PlanType, string> = {
  meal:    'bg-meal-color',
  study:   'bg-study-color',
  workout: 'bg-workout-color',
  other:   'bg-other-color',
};

export function PlanCard({ plan, date, onToggle, onEdit, onDelete, compact, showDate }: PlanCardProps) {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const done = isPlanCompletedOnDate(plan, date);
  const meta = PLAN_TYPE_META[plan.type];
  const [expanded, setExpanded] = useState(false);
  const duration = planDurationMinutes(plan);

  return (
    <div
      className={clsx(
        'group relative border-2 rounded-md transition-all duration-150',
        colorBg[plan.type],
        done && 'opacity-60',
        'border-[var(--ink)]',
        !compact && 'shadow-brutal-sm hover:shadow-brutal',
        compact && 'hover:translate-x-[1px] hover:translate-y-[1px]'
      )}
    >
      {/* 类型色条 */}
      <div className={clsx('absolute left-0 top-0 bottom-0 w-1.5 rounded-l-sm', colorAccent[plan.type])} />

      <div className="pl-4 pr-2 py-2.5 flex items-start gap-2.5">
        <input
          type="checkbox"
          className="brutal-checkbox mt-0.5"
          checked={done}
          onChange={() => onToggle(plan.id, dateStr)}
          aria-label={`标记 ${plan.title} 为${done ? '未完成' : '完成'}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">{meta.emoji}</span>
            <span
              className={clsx(
                'font-display font-bold text-[15px] leading-tight truncate',
                done && 'line-through decoration-2'
              )}
            >
              {plan.title}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-[var(--ink-soft)]">
            <span className="font-semibold text-[var(--ink)]">
              {hm(plan.startTime)} – {hm(plan.endTime)}
            </span>
            <span className="opacity-50">·</span>
            <span>{duration} 分钟</span>
            {plan.recurrence && plan.recurrence.type !== 'none' && (
              <>
                <span className="opacity-50">·</span>
                <Repeat size={11} className="opacity-70" />
                <span>{recurrenceLabel(plan.recurrence.type)}</span>
              </>
            )}
            {plan.reminder?.enabled && (
              <>
                <span className="opacity-50">·</span>
                <Bell size={11} className="opacity-70" />
                <span>提前 {plan.reminder.offsetMinutes}m</span>
              </>
            )}
          </div>
          {plan.note && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[11px] text-[var(--ink-soft)] hover:text-[var(--ink)] flex items-center gap-1"
            >
              <ChevronDown
                size={11}
                className={clsx('transition-transform', expanded && 'rotate-180')}
              />
              备注
            </button>
          )}
          {expanded && plan.note && (
            <div className="mt-1 text-xs text-[var(--ink-soft)] leading-relaxed border-l-2 border-[var(--ink-soft)]/30 pl-2">
              {plan.note}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(plan)}
            className="p-1 rounded hover:bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            title="编辑"
            aria-label="编辑计划"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={() => {
              if (confirm(`确定删除「${plan.title}」?`)) onDelete(plan.id);
            }}
            className="p-1 rounded hover:bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--terracotta)]"
            title="删除"
            aria-label="删除计划"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function recurrenceLabel(type: PlanItem['recurrence'] extends infer R ? R extends { type: infer T } ? T : never : never): string {
  switch (type) {
    case 'daily': return '每日';
    case 'weekdays': return '工作日';
    case 'weekly': return '每周';
    case 'custom': return '自定义';
    default: return '';
  }
}
