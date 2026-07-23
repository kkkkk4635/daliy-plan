import { useMemo, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Flame, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useScheduleStore, getActivePlansForDate, isDayPerfect } from '../store/useScheduleStore';
import { parseISO, ymd, cnDate, WEEKDAY_CN_FULL, isSameDay } from '../utils/date';
import { PlanCard } from '../components/PlanCard';
import { EditDrawer } from '../components/EditDrawer';
import { BrutalButton, Tag } from '../components/UI';
import { setMeta } from '../utils/idb';
import { updateStreakOnCompletion } from '../hooks/useAchievements';
import { toast } from '../components/Toast';
import { type PlanItem, type TimeSlot } from '../types';

// 分区定义
const SECTIONS: { key: TimeSlot; label: string; emoji: string; hours: string }[] = [
  { key: 'morning',   label: '上午', emoji: '🌅', hours: '06:00 - 12:00' },
  { key: 'afternoon', label: '下午', emoji: '☀️', hours: '12:00 - 18:00' },
  { key: 'evening',   label: '晚上', emoji: '🌙', hours: '18:00 - 23:00' },
];

export function Home() {
  const plans = useScheduleStore((s) => s.plans);
  const selectedDate = useScheduleStore((s) => s.selectedDate);
  const shiftDate = useScheduleStore((s) => s.shiftDate);
  const goToday = useScheduleStore((s) => s.goToday);
  const setStreak = useScheduleStore((s) => s.setStreak);
  const streak = useScheduleStore((s) => s.streak);
  const toggleComplete = useScheduleStore((s) => s.toggleComplete);
  const removePlan = useScheduleStore((s) => s.removePlan);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [drawerTime, setDrawerTime] = useState<{ start: Date; end: Date; date: Date } | undefined>();

  const date = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const today = new Date();
  const isToday = isSameDay(date, today);

  const activePlans = useMemo(() => {
    const all = getActivePlansForDate({ plans } as any, date);
    return all.filter((p) => p.category === 'routine');
  }, [plans, date]);
  const perfect = isDayPerfect({ plans } as any, date);
  const done = activePlans.filter((p) => p.completedDates.includes(selectedDate)).length;

  // 按分区分组
  const plansBySlot = useMemo(() => {
    const groups: Record<TimeSlot, typeof activePlans> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const p of activePlans) {
      const slot = (p.slot || 'morning') as TimeSlot;
      groups[slot].push(p);
    }
    return groups;
  }, [activePlans]);

  const handleToggle = async (id: string, dateStr: string) => {
    await toggleComplete(id, dateStr);
    // 重新计算 streak
    const updated = useScheduleStore.getState().plans;
    const target = updated.find((p) => p.id === id);
    if (target) {
      const isCompleting = !target.completedDates.includes(dateStr);
      if (isCompleting) {
        const todayYmd = ymd(today);
        // 仅当完成的是今日任务时更新 streak
        if (dateStr === todayYmd) {
          const newStreak = updateStreakOnCompletion(todayYmd, useScheduleStore.getState().streak);
          await setMeta('streak', newStreak);
          setStreak(newStreak);
          if (newStreak.current === streak.current + 1 && newStreak.current > 0) {
            toast(`连续打卡 ${newStreak.current} 天,继续加油!`, 'success');
          }
        }
      }
    }
  };

  const handleEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setDrawerTime(undefined);
    setDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingPlan(null);
    setDrawerTime(undefined);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 日期控制条 */}
      <div className="px-4 lg:px-8 py-4 border-b-2 border-[var(--ink)] flex items-center gap-3 bg-[var(--bg-soft)]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftDate(-1)}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] shadow-brutal-sm"
            aria-label="前一天"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => shiftDate(1)}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] shadow-brutal-sm"
            aria-label="后一天"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
            {WEEKDAY_CN_FULL[date.getDay()]}
          </div>
          <div className="font-display text-xl font-bold truncate">
            {cnDate(date, 'yyyy 年 M 月 d 日')}
          </div>
        </div>
        {!isToday && (
          <BrutalButton variant="secondary" size="sm" onClick={goToday}>
            回到今天
          </BrutalButton>
        )}
        <div className="flex items-center gap-2">
          {perfect && (
            <Tag color="terracotta">
              <Sparkles size={11} />
              完美一天
            </Tag>
          )}
          <Tag color="ink">
            <Flame size={11} />
            {streak.current}d
          </Tag>
        </div>
        <BrutalButton variant="primary" onClick={handleAdd} className="hidden md:inline-flex">
          <Plus size={16} />
          新建
        </BrutalButton>
      </div>

      {/* 主区:分区课表 + 侧栏 */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* 分区课表 */}
        <div className="flex-1 overflow-y-auto relative">
          {activePlans.length === 0 && (
            <EmptyState onAdd={handleAdd} />
          )}
          <div className="p-4 lg:p-6 space-y-6">
            {SECTIONS.map((section) => {
              const sectionPlans = plansBySlot[section.key];
              return (
                <section key={section.key}>
                  {/* 分区标题 */}
                  <div className="flex items-center gap-2 px-1 mb-2.5">
                    <span className="text-lg">{section.emoji}</span>
                    <span className="font-display font-bold text-base">{section.label}</span>
                    <span className="text-[11px] font-mono text-[var(--ink-soft)]">{section.hours}</span>
                  </div>
                  {/* 分区内任务列表 */}
                  {sectionPlans.length === 0 ? (
                    <div className="px-1 py-2 text-xs text-[var(--ink-soft)]/60">暂无安排</div>
                  ) : (
                    <div className="space-y-2">
                      {sectionPlans.map((plan) => (
                        <PlanCard
                          key={plan.id}
                          plan={plan}
                          date={date}
                          onToggle={handleToggle}
                          onEdit={handleEdit}
                          onDelete={removePlan}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {/* 右侧今日汇总 */}
        <aside className="hidden xl:flex flex-col w-80 border-l-2 border-[var(--ink)] p-5 bg-[var(--bg-soft)] overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-2">
            今日汇总
          </div>
          <div className="font-display text-2xl font-bold mb-4">
            {activePlans.length === 0 ? '尚无安排' : `${done} / ${activePlans.length} 完成`}
          </div>
          {activePlans.length > 0 && (
            <div className="space-y-3">
              {SECTIONS.map((section) => {
                const sectionPlans = plansBySlot[section.key];
                if (sectionPlans.length === 0) return null;
                return (
                  <div key={section.key}>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5 flex items-center gap-1">
                      <span>{section.emoji}</span>
                      {section.label}
                    </div>
                    <div className="space-y-2">
                      {sectionPlans.map((p) => {
                        const s = new Date(p.startTime);
                        const e = new Date(p.endTime);
                        return (
                          <div
                            key={p.id}
                            className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-2.5 shadow-brutal-sm"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="brutal-checkbox"
                                checked={p.completedDates.includes(selectedDate)}
                                onChange={() => handleToggle(p.id, selectedDate)}
                              />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={clsx(
                                    'text-sm font-semibold truncate',
                                    p.completedDates.includes(selectedDate) && 'line-through opacity-60'
                                  )}
                                >
                                  {p.title}
                                </div>
                                <div className="text-[11px] font-mono text-[var(--ink-soft)]">
                                  {String(s.getHours()).padStart(2, '0')}:{String(s.getMinutes()).padStart(2, '0')} - {String(e.getHours()).padStart(2, '0')}:{String(e.getMinutes()).padStart(2, '0')}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-auto pt-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-2">
              鼓励
            </div>
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
              <div className="text-sm font-display font-bold leading-relaxed">
                {perfect
                  ? '✨ 今日 100% 完成,你真的太棒了!'
                  : done > 0
                  ? `继续保持,还差 ${activePlans.length - done} 项!`
                  : '种一棵树最好的时间是十年前,其次是现在。'}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 移动端浮动新建按钮 */}
      <button
        onClick={handleAdd}
        className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-[var(--terracotta)] text-white border-2 border-[var(--ink)] shadow-brutal flex items-center justify-center"
        aria-label="新建计划"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center pointer-events-auto">
        <div className="w-20 h-20 mx-auto mb-4 border-2 border-dashed border-[var(--ink)] rounded-md flex items-center justify-center text-[var(--ink-soft)]">
          <CalendarIcon size={32} />
        </div>
        <div className="font-display text-xl font-bold mb-1">今天还没有安排</div>
        <div className="text-sm text-[var(--ink-soft)] mb-4">点击下方按钮或课表空白处添加</div>
        <BrutalButton variant="primary" onClick={onAdd}>
          <Plus size={16} />
          添加第一个计划
        </BrutalButton>
      </div>
    </div>
  );
}
