import { useState, useMemo } from 'react';
import { CheckCircle, Circle, ChevronRight, Plus, Bell } from 'lucide-react';
import clsx from 'clsx';
import { useScheduleStore } from '../store/useScheduleStore';
import { ymd, parseISO, hm } from '../utils/date';
import { PLAN_TYPE_META, PRIORITY_META } from '../types';
import type { PlanItem } from '../types';
import { TodoDrawer } from '../components/TodoDrawer';

type FilterType = 'all' | 'today' | 'overdue' | 'upcoming';

export function TodoView() {
  const plans = useScheduleStore((s) => s.plans);
  const toggleComplete = useScheduleStore((s) => s.toggleComplete);
  const removePlan = useScheduleStore((s) => s.removePlan);
  const [filter, setFilter] = useState<FilterType>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  const today = new Date();
  const todayYmd = ymd(today);

  const todoItems = useMemo(() => {
    const result: { plan: PlanItem; isCompleted: boolean }[] = [];

    plans.forEach((plan) => {
      if (plan.category !== 'todo') return;
      const deadline = parseISO(plan.endTime);
      const deadlineYmd = ymd(deadline);
      const isCompleted = plan.completedDates.includes(deadlineYmd);
      result.push({ plan, isCompleted });
    });

    return result.sort((a, b) => {
      // 已完成的排后面
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;

      // 按优先级排序：高 > 中 > 低
      const pa = PRIORITY_META[a.plan.priority || 'medium'].weight;
      const pb = PRIORITY_META[b.plan.priority || 'medium'].weight;
      if (pa !== pb) return pa - pb;

      // 按截止时间排序：早的在前
      return a.plan.endTime.localeCompare(b.plan.endTime);
    });
  }, [plans]);

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'today':
        return todoItems.filter((t) => ymd(parseISO(t.plan.endTime)) === todayYmd && !t.isCompleted);
      case 'overdue':
        return todoItems.filter((t) => ymd(parseISO(t.plan.endTime)) < todayYmd && !t.isCompleted);
      case 'upcoming':
        return todoItems.filter((t) => ymd(parseISO(t.plan.endTime)) > todayYmd && !t.isCompleted);
      default:
        return todoItems;
    }
  }, [todoItems, filter, todayYmd]);

  const stats = useMemo(() => {
    const incomplete = todoItems.filter((t) => !t.isCompleted);
    const total = incomplete.length;
    const todayCount = incomplete.filter((t) => ymd(parseISO(t.plan.endTime)) === todayYmd).length;
    const overdueCount = incomplete.filter((t) => ymd(parseISO(t.plan.endTime)) < todayYmd).length;
    const upcomingCount = incomplete.filter((t) => ymd(parseISO(t.plan.endTime)) > todayYmd).length;
    return { total, todayCount, overdueCount, upcomingCount };
  }, [todoItems, todayYmd]);

  const groupedTodos = useMemo(() => {
    const groups: Record<string, typeof filteredTodos> = {};
    filteredTodos.forEach((t) => {
      const deadlineYmd = ymd(parseISO(t.plan.endTime));
      const key = deadlineYmd === todayYmd ? 'today' : deadlineYmd < todayYmd ? 'overdue' : 'upcoming';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTodos, todayYmd]);

  const handleToggle = async (plan: PlanItem, date: string) => {
    await toggleComplete(plan.id, date);
  };

  const handleEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingPlan(null);
    setDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此待办？')) return;
    await removePlan(id);
  };

  const getDeadlineLabel = (iso: string) => {
    const date = parseISO(iso);
    const dateYmd = ymd(date);
    if (dateYmd === todayYmd) return '今天';
    const diff = Math.floor((date.getTime() - today.getTime()) / (24 * 3600 * 1000));
    if (diff === 1) return '明天';
    if (diff === -1) return '昨天';
    if (diff < 0) return `逾期 ${-diff} 天`;
    if (diff <= 7) return `${diff} 天后`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getDeadlineStatus = (iso: string) => {
    const dateYmd = ymd(parseISO(iso));
    if (dateYmd === todayYmd) return 'today';
    if (dateYmd < todayYmd) return 'overdue';
    return 'upcoming';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 lg:px-8 py-4 border-b-2 border-[var(--ink)] flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[var(--bg-soft)]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">todos</div>
          <div className="font-display text-xl font-bold">待办清单</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: 'all' as FilterType, label: `全部(${stats.total})` },
            { key: 'today' as FilterType, label: `今天(${stats.todayCount})` },
            { key: 'overdue' as FilterType, label: `逾期(${stats.overdueCount})` },
            { key: 'upcoming' as FilterType, label: `未来(${stats.upcomingCount})` },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={clsx(
                'px-3 py-1.5 text-xs font-semibold border-2 border-[var(--ink)] rounded-md transition-all',
                filter === opt.key
                  ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm'
                  : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
              )}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border-2 border-[var(--ink)] rounded-md bg-[var(--terracotta)] text-white shadow-brutal-sm hover:shadow-brutal-hover transition-all"
          >
            <Plus size={14} />
            新建待办
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {filteredTodos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-[var(--ink)] rounded-md flex items-center justify-center text-[var(--ink-soft)]">
                <CheckCircle size={32} />
              </div>
              <div className="font-display text-xl font-bold mb-1">暂无待办</div>
              <div className="text-sm text-[var(--ink-soft)]">点击右上角「新建待办」添加任务</div>
            </div>
          ) : (
            <>
              {(filter === 'all' ? ['overdue', 'today', 'upcoming'] : [filter]).map((groupKey) => {
                const items = groupedTodos[groupKey];
                if (!items || items.length === 0) return null;

                const groupLabels: Record<string, { label: string; emoji: string; color: string }> = {
                  overdue: { label: '已逾期', emoji: '⚠️', color: 'text-red-600' },
                  today: { label: '今天', emoji: '📅', color: 'text-[var(--terracotta)]' },
                  upcoming: { label: '未来', emoji: '🔮', color: 'text-[var(--ink-soft)]' },
                };
                const groupInfo = groupLabels[groupKey];

                return (
                  <div key={groupKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <span>{groupInfo.emoji}</span>
                      <span className={clsx('text-xs font-mono uppercase tracking-widest', groupInfo.color)}>
                        {groupInfo.label}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--ink-soft)]">({items.length})</span>
                    </div>
                    <div className="space-y-2">
                      {items.map(({ plan, isCompleted }) => {
                        const deadline = parseISO(plan.endTime);
                        const meta = PLAN_TYPE_META[plan.type];
                        const prioMeta = PRIORITY_META[plan.priority || 'medium'];
                        const dateStatus = getDeadlineStatus(plan.endTime);
                        const deadlineYmd = ymd(deadline);

                        return (
                          <div
                            key={plan.id}
                            className={clsx(
                              'flex items-center gap-3 p-3 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] shadow-brutal-sm transition-all',
                              isCompleted && 'opacity-60'
                            )}
                          >
                            <button
                              onClick={() => handleToggle(plan, deadlineYmd)}
                              className="flex-shrink-0"
                            >
                              {isCompleted ? (
                                <CheckCircle size={20} className="text-[var(--teal)]" />
                              ) : (
                                <Circle size={20} className="text-[var(--ink-soft)]" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold truncate">
                                  {isCompleted ? <span className="line-through">{plan.title}</span> : plan.title}
                                </span>
                                <span className="text-xs">{meta.emoji}</span>
                                {/* 优先级标签 */}
                                <span className={clsx('text-[10px] font-mono font-bold', prioMeta.color)}>
                                  {prioMeta.emoji}{prioMeta.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[11px] font-mono text-[var(--ink-soft)]">
                                  截止：{getDeadlineLabel(plan.endTime)} {hm(deadline)}
                                </span>
                                {dateStatus === 'overdue' && !isCompleted && (
                                  <span className="text-[10px] font-mono text-red-600 font-bold">已逾期</span>
                                )}
                                {plan.reminder?.enabled && (
                                  <span className="flex items-center gap-0.5 text-[10px] font-mono text-[var(--ink-soft)]">
                                    <Bell size={10} />
                                    {plan.reminder.offsetMinutes === 0
                                      ? '截止时'
                                      : plan.reminder.offsetMinutes < 60
                                        ? `前${plan.reminder.offsetMinutes}分钟`
                                        : plan.reminder.offsetMinutes < 1440
                                          ? `前${Math.floor(plan.reminder.offsetMinutes / 60)}小时`
                                          : `前${Math.floor(plan.reminder.offsetMinutes / 1440)}天`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEdit(plan)}
                                className="w-8 h-8 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)]"
                                aria-label="编辑"
                              >
                                <ChevronRight size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(plan.id)}
                                className="w-8 h-8 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-red-50 hover:text-red-600"
                                aria-label="删除"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <TodoDrawer
        open={drawerOpen}
        editing={editingPlan}
        onClose={() => {
          setDrawerOpen(false);
          setEditingPlan(null);
        }}
      />
    </div>
  );
}
