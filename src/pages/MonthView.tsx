import { useMemo, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  format,
  ymd,
  cnDate,
  WEEKDAY_CN,
} from '../utils/date';
import { useScheduleStore } from '../store/useScheduleStore';
import { useNavigate } from 'react-router-dom';
import { EditDrawer } from '../components/EditDrawer';
import { BrutalButton } from '../components/UI';
import { setMeta } from '../utils/idb';
import { PLAN_TYPE_META } from '../types';
import type { PlanItem } from '../types';
import clsx from 'clsx';

export function MonthView() {
  const navigate = useNavigate();
  const plans = useScheduleStore((s) => s.plans);
  const setSelectedDate = useScheduleStore((s) => s.setSelectedDate);
  const preferences = useScheduleStore((s) => s.preferences);
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [drawerTime, setDrawerTime] = useState<{ start: Date; end: Date; date: Date } | undefined>();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: preferences.weekStart });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: preferences.weekStart });
    return eachDayOfInterval({ start, end });
  }, [monthAnchor, preferences.weekStart]);

  // 索引: dateStr -> active plans
  const plansByDate = useMemo(() => {
    const map = new Map<string, PlanItem[]>();
    plans.filter((p) => p.category === 'routine').forEach((p) => {
      const start = parseISO(p.startTime);
      if (!p.recurrence || p.recurrence.type === 'none') {
        const key = ymd(start);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
        return;
      }
      // 重复: 简单在月视图范围内展开
      const monthStart = startOfMonth(monthAnchor);
      const monthEnd = endOfMonth(monthAnchor);
      let cur = new Date(Math.max(start.getTime(), monthStart.getTime()));
      cur.setHours(0, 0, 0, 0);
      while (cur <= monthEnd) {
        const dow = cur.getDay();
        let hit = false;
        if (p.recurrence.type === 'daily') hit = true;
        else if (p.recurrence.type === 'weekdays') hit = dow >= 1 && dow <= 5;
        else if (p.recurrence.type === 'weekly' || p.recurrence.type === 'custom') {
          hit = (p.recurrence.daysOfWeek || []).includes(dow);
        }
        if (hit) {
          const key = ymd(cur);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(p);
        }
        cur = new Date(cur.getTime() + 24 * 3600 * 1000);
      }
    });
    return map;
  }, [plans, monthAnchor]);

  const today = new Date();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 lg:px-8 py-4 border-b-2 border-[var(--ink)] flex items-center gap-3 bg-[var(--bg-soft)]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonthAnchor(addMonths(monthAnchor, -1))}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] shadow-brutal-sm"
            aria-label="上个月"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] shadow-brutal-sm"
            aria-label="下个月"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">month</div>
          <div className="font-display text-xl font-bold truncate">{cnDate(monthAnchor, 'yyyy 年 M 月')}</div>
        </div>
        <BrutalButton variant="secondary" size="sm" onClick={() => setMonthAnchor(startOfMonth(new Date()))}>
          本月
        </BrutalButton>
        <BrutalButton
          variant="primary"
          onClick={() => {
            setEditingPlan(null);
            setDrawerTime(undefined);
            setDrawerOpen(true);
          }}
          className="hidden md:inline-flex"
        >
          <Plus size={16} />
          新建
        </BrutalButton>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-7 border-2 border-[var(--ink)] rounded-md overflow-hidden bg-[var(--bg)] shadow-brutal-sm">
            {/* 表头 */}
            {Array.from({ length: 7 }).map((_, i) => {
              const dow = (preferences.weekStart + i) % 7;
              return (
                <div
                  key={i}
                  className="text-center py-2 bg-[var(--ink)] text-[var(--bg)] text-xs font-mono font-bold tracking-widest"
                >
                  {WEEKDAY_CN[dow]}
                </div>
              );
            })}
            {/* 日期格 */}
            {days.map((d) => {
              const inMonth = isSameMonth(d, monthAnchor);
              const isToday = isSameDay(d, today);
              const list = plansByDate.get(ymd(d)) || [];
              const doneCount = list.filter((p) => p.completedDates.includes(ymd(d))).length;
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => {
                    setSelectedDate(ymd(d));
                    navigate('/');
                  }}
                  className={clsx(
                    'group relative h-24 sm:h-28 p-1.5 border-t border-r border-[var(--ink)]/15 text-left transition-all',
                    'hover:bg-[var(--bg-soft)]',
                    !inMonth && 'opacity-40 bg-[var(--bg-soft)]/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={clsx(
                        'inline-flex items-center justify-center w-6 h-6 text-xs font-bold',
                        isToday
                          ? 'bg-[var(--terracotta)] text-white border-2 border-[var(--ink)] rounded-full'
                          : 'text-[var(--ink)]'
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {list.length > 0 && (
                      <span className="text-[10px] font-mono text-[var(--ink-soft)]">
                        {doneCount}/{list.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((p) => {
                      const completed = p.completedDates.includes(ymd(d));
                      const meta = PLAN_TYPE_META[p.type];
                      const colorClass = p.type === 'meal' ? 'bg-meal-color' :
                        p.type === 'study' ? 'bg-study-color' :
                        p.type === 'workout' ? 'bg-workout-color' : 'bg-other-color';
                      return (
                        <div
                          key={p.id}
                          className={clsx(
                            'flex items-center gap-1 text-[10px] truncate rounded px-1',
                            completed ? 'line-through opacity-60' : ''
                          )}
                        >
                          <span className={clsx('inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', colorClass)} />
                          <span className="truncate">{meta.emoji} {p.title}</span>
                        </div>
                      );
                    })}
                    {list.length > 3 && (
                      <div className="text-[10px] text-[var(--ink-soft)]">+{list.length - 3}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <EditDrawer
        open={drawerOpen}
        editing={editingPlan}
        initialDate={drawerTime?.date}
        initialTime={drawerTime ? { start: drawerTime.start, end: drawerTime.end } : undefined}
        onClose={() => {
          setDrawerOpen(false);
          setEditingPlan(null);
        }}
      />
    </div>
  );
}
