import { useMemo, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  addDays,
  eachDayOfInterval,
  format,
  parseISO,
  cnDate as _cnDate,
  cnDate,
  isSameDay,
  ymd,
} from '../utils/date';
import { useScheduleStore } from '../store/useScheduleStore';
import { EditDrawer } from '../components/EditDrawer';
import { PlanCard } from '../components/PlanCard';
import { BrutalButton } from '../components/UI';
import type { PlanItem } from '../types';
import { setMeta } from '../utils/idb';
import { updateStreakOnCompletion } from '../hooks/useAchievements';
import { toast } from '../components/Toast';

const HOUR_START = 6;
const HOUR_END = 22;
const SLOT_PX = 24;

export function WeekView() {
  const plans = useScheduleStore((s) => s.plans);
  const preferences = useScheduleStore((s) => s.preferences);
  const toggleComplete = useScheduleStore((s) => s.toggleComplete);
  const removePlan = useScheduleStore((s) => s.removePlan);
  const setStreak = useScheduleStore((s) => s.setStreak);
  const streak = useScheduleStore((s) => s.streak);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: preferences.weekStart }));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [drawerTime, setDrawerTime] = useState<{ start: Date; end: Date; date: Date } | undefined>();

  const days = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  }, [weekStart]);

  const handleToggle = async (id: string, dateStr: string) => {
    await toggleComplete(id, dateStr);
    const updated = useScheduleStore.getState().plans;
    const target = updated.find((p) => p.id === id);
    if (target) {
      const isCompleting = !target.completedDates.includes(dateStr);
      if (isCompleting) {
        const todayYmd = ymd(new Date());
        if (dateStr === todayYmd) {
          const newStreak = updateStreakOnCompletion(todayYmd, useScheduleStore.getState().streak);
          await setMeta('streak', newStreak);
          setStreak(newStreak);
          if (newStreak.current === streak.current + 1 && newStreak.current > 0) {
            toast(`连续打卡 ${newStreak.current} 天!`, 'success');
          }
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 lg:px-8 py-4 border-b-2 border-[var(--ink)] flex items-center gap-3 bg-[var(--bg-soft)]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] shadow-brutal-sm"
            aria-label="上一周"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] shadow-brutal-sm"
            aria-label="下一周"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
            week
          </div>
          <div className="font-display text-xl font-bold truncate">
            {cnDate(weekStart, 'yyyy M 月 d 日')} – {cnDate(addDays(weekStart, 6), 'M 月 d 日')}
          </div>
        </div>
        <BrutalButton variant="secondary" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: preferences.weekStart }))}>
          本周
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

      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* 日期表头 */}
          <div className="grid border-b-2 border-[var(--ink)] sticky top-0 z-10 bg-[var(--bg)]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            <div className="border-r-2 border-[var(--ink)]"></div>
            {days.map((d) => {
              const isToday = isSameDay(d, new Date());
              return (
                <div
                  key={d.toISOString()}
                  className={`text-center py-2 border-r border-[var(--ink)]/20 ${isToday ? 'bg-[var(--terracotta)]/10' : ''}`}
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
                    {format(d, 'EEE', { locale: undefined })}
                  </div>
                  <div className={`font-display text-lg font-bold ${isToday ? 'text-[var(--terracotta)]' : ''}`}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          {/* 网格主体 */}
          <div className="relative" style={{ height: `${(HOUR_END - HOUR_START + 1) * SLOT_PX * 2}px` }}>
            {Array.from({ length: HOUR_END - HOUR_START + 1 }).map((_, idx) => {
              const h = HOUR_START + idx;
              return (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-dashed border-[var(--ink)]/15"
                  style={{ top: `${idx * SLOT_PX * 2}px`, height: `${SLOT_PX * 2}px` }}
                >
                  <div className="grid h-full" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
                    <div className="text-right pr-2 pt-0.5 text-[10px] font-mono text-[var(--ink-soft)] border-r-2 border-[var(--ink)]">
                      {String(h).padStart(2, '0')}:00
                    </div>
                    {days.map((d) => (
                      <button
                        key={d.toISOString()}
                        onClick={() => {
                          const start = new Date(d);
                          start.setHours(h, 0, 0, 0);
                          const end = new Date(start);
                          end.setHours(h + 1);
                          setEditingPlan(null);
                          setDrawerTime({ start, end, date: d });
                          setDrawerOpen(true);
                        }}
                        className="border-r border-[var(--ink)]/10 hover:bg-[var(--terracotta)]/5 transition-colors text-left"
                        aria-label={`${ymd(d)} ${h}:00 添加计划`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {/* 渲染计划块 - 每个日期列内独立堆叠 */}
            {days.map((d, dayIdx) => {
              const dayActive = plans
                .filter((p) => p.category === 'routine')
                .filter((p) => {
                  const start = parseISO(p.startTime);
                  return (
                    start.getHours() * 60 + start.getMinutes() >= HOUR_START * 60 &&
                    isSameDay(new Date(start.getFullYear(), start.getMonth(), start.getDate()), d)
                  );
                })
                .filter((p) => {
                  const start = parseISO(p.startTime);
                  const end = parseISO(p.endTime);
                  if (!p.recurrence || p.recurrence.type === 'none') {
                    return isSameDay(start, d);
                  }
                  // 重复规则判断
                  return d >= new Date(start.getFullYear(), start.getMonth(), start.getDate());
                })
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              return dayActive.map((plan) => {
                const start = parseISO(plan.startTime);
                const end = parseISO(plan.endTime);
                const startMin = start.getHours() * 60 + start.getMinutes();
                const endMin = end.getHours() * 60 + end.getMinutes();
                const top = ((startMin - HOUR_START * 60) / 30) * SLOT_PX;
                const height = Math.max(SLOT_PX, ((endMin - startMin) / 30) * SLOT_PX);
                const colWidth = `calc((100% - 60px) / 7)`;
                const left = `calc(60px + ${dayIdx} * ${colWidth})`;
                return (
                  <div
                    key={`${plan.id}-${d.toISOString()}`}
                    className="absolute px-1"
                    style={{ top, height, left, width: `calc(${colWidth} - 4px)` }}
                  >
                    <PlanCard
                      plan={plan}
                      date={d}
                      onToggle={handleToggle}
                      onEdit={(p) => {
                        setEditingPlan(p);
                        setDrawerTime(undefined);
                        setDrawerOpen(true);
                      }}
                      onDelete={removePlan}
                      compact
                    />
                  </div>
                );
              });
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
