import { useState, useMemo } from 'react';
import { BarChart3, CalendarDays, CalendarRange, Calendar, Clock, Trophy, Target, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useScheduleStore } from '../store/useScheduleStore';
import { ymd, parseISO, isSameDay, isSameWeek, isSameMonth, isSameYear, startOfWeek, startOfMonth, startOfYear, addDays, addWeeks, addMonths, addYears, cnDate } from '../utils/date';
import { PLAN_TYPE_META } from '../types';
import type { PlanType } from '../types';

type Period = 'day' | 'week' | 'month' | 'year';

interface DayStats {
  date: string;
  total: number;
  done: number;
  types: Record<PlanType, number>;
  duration: number;
}

interface PeriodStats {
  label: string;
  total: number;
  done: number;
  rate: number;
  types: Record<PlanType, number>;
  duration: number;
}

interface MonthStats {
  month: number;
  label: string;
  total: number;
  done: number;
  rate: number;
  types: Record<PlanType, number>;
  duration: number;
}

export function Statistics() {
  const [period, setPeriod] = useState<Period>('week');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const plans = useScheduleStore((s) => s.plans);
  const preferences = useScheduleStore((s) => s.preferences);

  const today = ymd(new Date());

  const dateRange = useMemo(() => {
    switch (period) {
      case 'day':
        return [anchorDate, anchorDate];
      case 'week': {
        const start = startOfWeek(anchorDate, { weekStartsOn: preferences.weekStart });
        return [start, addDays(start, 6)];
      }
      case 'month': {
        const start = startOfMonth(anchorDate);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        return [start, end];
      }
      case 'year': {
        const start = startOfYear(anchorDate);
        const end = new Date(start.getFullYear(), 11, 31);
        return [start, end];
      }
    }
  }, [period, anchorDate, preferences.weekStart]);

  const days = useMemo(() => {
    const [start, end] = dateRange;
    const result: Date[] = [];
    let cur = new Date(start);
    while (cur <= end) {
      result.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    return result;
  }, [dateRange]);

  const dayStatsList = useMemo((): DayStats[] => {
    return days.map((date) => {
      const dateStr = ymd(date);
      const active = plans.filter((p) => {
        if (p.category === 'todo') {
          const deadlineYmd = ymd(parseISO(p.endTime));
          return deadlineYmd === dateStr;
        }
        const start = parseISO(p.startTime);
        const targetYmd = ymd(date);
        const startYmd = ymd(start);
        if (targetYmd < startYmd) return false;
        if (!p.recurrence || p.recurrence.type === 'none') {
          return targetYmd === startYmd;
        }
        const dow = date.getDay();
        if (p.recurrence.type === 'daily') return true;
        if (p.recurrence.type === 'weekdays') return dow >= 1 && dow <= 5;
        if (p.recurrence.type === 'weekly' || p.recurrence.type === 'custom') {
          return (p.recurrence.daysOfWeek || []).includes(dow);
        }
        return false;
      });
      const done = active.filter((p) => p.completedDates.includes(dateStr)).length;
      const types: Record<PlanType, number> = { meal: 0, study: 0, workout: 0, other: 0 };
      active.forEach((p) => types[p.type]++);
      const duration = active.reduce((acc, p) => {
        const s = parseISO(p.startTime);
        const e = parseISO(p.endTime);
        return acc + Math.round((e.getTime() - s.getTime()) / 60000);
      }, 0);
      return { date: dateStr, total: active.length, done, types, duration };
    });
  }, [days, plans]);

  const periodStats = useMemo((): PeriodStats => {
    const stats = dayStatsList.reduce((acc, d) => {
      acc.total += d.total;
      acc.done += d.done;
      Object.entries(d.types).forEach(([k, v]) => {
        acc.types[k as PlanType] += v;
      });
      acc.duration += d.duration;
      return acc;
    }, { total: 0, done: 0, types: { meal: 0, study: 0, workout: 0, other: 0 }, duration: 0 });
    return {
      ...stats,
      label: period === 'day' ? cnDate(anchorDate) :
        period === 'week' ? `${cnDate(dateRange[0], 'M月d日')} – ${cnDate(dateRange[1], 'M月d日')}` :
        period === 'month' ? cnDate(anchorDate, 'yyyy年M月') :
        `${anchorDate.getFullYear()}年`,
      rate: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
    };
  }, [dayStatsList, period, anchorDate, dateRange]);

  const recent7Days = useMemo(() => {
    const result: DayStats[] = [];
    let cur = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = addDays(cur, -i);
      const dateStr = ymd(date);
      const active = plans.filter((p) => {
        if (p.category === 'todo') {
          const deadlineYmd = ymd(parseISO(p.endTime));
          return deadlineYmd === dateStr;
        }
        const start = parseISO(p.startTime);
        const targetYmd = ymd(date);
        const startYmd = ymd(start);
        if (targetYmd < startYmd) return false;
        if (!p.recurrence || p.recurrence.type === 'none') {
          return targetYmd === startYmd;
        }
        const dow = date.getDay();
        if (p.recurrence.type === 'daily') return true;
        if (p.recurrence.type === 'weekdays') return dow >= 1 && dow <= 5;
        if (p.recurrence.type === 'weekly' || p.recurrence.type === 'custom') {
          return (p.recurrence.daysOfWeek || []).includes(dow);
        }
        return false;
      });
      const done = active.filter((p) => p.completedDates.includes(dateStr)).length;
      const types: Record<PlanType, number> = { meal: 0, study: 0, workout: 0, other: 0 };
      active.forEach((p) => types[p.type]++);
      const duration = active.reduce((acc, p) => {
        const s = parseISO(p.startTime);
        const e = parseISO(p.endTime);
        return acc + Math.round((e.getTime() - s.getTime()) / 60000);
      }, 0);
      result.push({ date: dateStr, total: active.length, done, types, duration });
    }
    return result;
  }, [plans]);

  const monthStatsList = useMemo((): MonthStats[] => {
    if (period !== 'year') return [];
    const year = anchorDate.getFullYear();
    const result: MonthStats[] = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = startOfMonth(new Date(year, month, 1));
      const monthEnd = new Date(year, month + 1, 0);
      const daysInMonth = [];
      let cur = new Date(monthStart);
      while (cur <= monthEnd) {
        daysInMonth.push(new Date(cur));
        cur = addDays(cur, 1);
      }
      const stats = daysInMonth.reduce((acc, date) => {
        const dateStr = ymd(date);
        const active = plans.filter((p) => {
          if (p.category === 'todo') {
            const deadlineYmd = ymd(parseISO(p.endTime));
            return deadlineYmd === dateStr;
          }
          const start = parseISO(p.startTime);
          const targetYmd = ymd(date);
          const startYmd = ymd(start);
          if (targetYmd < startYmd) return false;
          if (!p.recurrence || p.recurrence.type === 'none') {
            return targetYmd === startYmd;
          }
          const dow = date.getDay();
          if (p.recurrence.type === 'daily') return true;
          if (p.recurrence.type === 'weekdays') return dow >= 1 && dow <= 5;
          if (p.recurrence.type === 'weekly' || p.recurrence.type === 'custom') {
            return (p.recurrence.daysOfWeek || []).includes(dow);
          }
          return false;
        });
        acc.total += active.length;
        acc.done += active.filter((p) => p.completedDates.includes(dateStr)).length;
        active.forEach((p) => {
          acc.types[p.type]++;
          const s = parseISO(p.startTime);
          const e = parseISO(p.endTime);
          acc.duration += Math.round((e.getTime() - s.getTime()) / 60000);
        });
        return acc;
      }, { total: 0, done: 0, types: { meal: 0, study: 0, workout: 0, other: 0 }, duration: 0 });
      result.push({
        month,
        label: cnDate(monthStart, 'M月'),
        ...stats,
        rate: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
      });
    }
    return result;
  }, [period, anchorDate, plans]);

  const allTimeStats = useMemo(() => {
    const totalPlans = plans.length;
    const totalCompletedDates = plans.reduce((acc, p) => acc + p.completedDates.length, 0);
    const types: Record<PlanType, number> = { meal: 0, study: 0, workout: 0, other: 0 };
    plans.forEach((p) => types[p.type]++);
    const avgDuration = plans.length > 0
      ? Math.round(plans.reduce((acc, p) => {
        const s = parseISO(p.startTime);
        const e = parseISO(p.endTime);
        return acc + Math.round((e.getTime() - s.getTime()) / 60000);
      }, 0) / plans.length)
      : 0;
    return { totalPlans, totalCompletedDates, types, avgDuration };
  }, [plans]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}分钟`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
  };

  const handlePrev = () => {
    switch (period) {
      case 'day': setAnchorDate(addDays(anchorDate, -1)); break;
      case 'week': setAnchorDate(addWeeks(anchorDate, -1)); break;
      case 'month': setAnchorDate(addMonths(anchorDate, -1)); break;
      case 'year': setAnchorDate(addYears(anchorDate, -1)); break;
    }
  };

  const handleNext = () => {
    switch (period) {
      case 'day': setAnchorDate(addDays(anchorDate, 1)); break;
      case 'week': setAnchorDate(addWeeks(anchorDate, 1)); break;
      case 'month': setAnchorDate(addMonths(anchorDate, 1)); break;
      case 'year': setAnchorDate(addYears(anchorDate, 1)); break;
    }
  };

  const goToday = () => {
    setAnchorDate(new Date());
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 lg:px-8 py-4 border-b-2 border-[var(--ink)] flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[var(--bg-soft)]">
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} className="text-[var(--terracotta)]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">statistics</span>
          </div>
          <div className="font-display text-xl font-bold">{periodStats.label}</div>
        </div>
        <div className="flex items-center gap-2">
          {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setAnchorDate(new Date());
              }}
              className={clsx(
                'px-3 py-1.5 text-xs font-semibold border-2 border-[var(--ink)] rounded-md transition-all',
                period === p
                  ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm'
                  : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
              )}
            >
              {p === 'day' ? '今日' : p === 'week' ? '本周' : p === 'month' ? '本月' : '本年'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)]"
            aria-label="上一周期"
          >
            ←
          </button>
          <button
            onClick={goToday}
            className="px-2 py-1 text-[10px] font-mono border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)]"
          >
            今天
          </button>
          <button
            onClick={handleNext}
            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)]"
            aria-label="下一周期"
          >
            →
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} className="text-[var(--terracotta)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">总计划</span>
              </div>
              <div className="font-display text-2xl font-bold">{periodStats.total}</div>
            </div>
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={14} className="text-[var(--teal)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">已完成</span>
              </div>
              <div className="font-display text-2xl font-bold text-[var(--teal)]">{periodStats.done}</div>
            </div>
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-[var(--terracotta)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">完成率</span>
              </div>
              <div className="font-display text-2xl font-bold">{periodStats.rate}%</div>
              <div className="h-1.5 bg-[var(--bg-soft)] border border-[var(--ink)] rounded-sm mt-1 overflow-hidden">
                <div className="h-full bg-[var(--terracotta)] transition-all" style={{ width: `${periodStats.rate}%` }} />
              </div>
            </div>
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-[var(--ink-soft)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">总时长</span>
              </div>
              <div className="font-display text-xl font-bold">{formatDuration(periodStats.duration)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.entries(PLAN_TYPE_META) as [PlanType, typeof PLAN_TYPE_META[PlanType]][]).map(([type, meta]) => (
              <div key={type} className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span>{meta.emoji}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">{meta.label}</span>
                </div>
                <div className="font-display text-xl font-bold">{periodStats.types[type]}</div>
              </div>
            ))}
          </div>

          {period === 'year' ? (
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-4 shadow-brutal-sm">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-3">每月完成情况</div>
              <div className="flex items-end justify-between h-32 gap-1">
                {monthStatsList.map((m) => {
                  const maxTotal = Math.max(...monthStatsList.map((x) => x.total), 1);
                  const height = m.total > 0 ? (m.done / maxTotal) * 100 : 0;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-24 flex flex-col-reverse">
                        <div
                          className="w-full bg-[var(--terracotta)] rounded-t-sm transition-all"
                          style={{ height: `${height}%` }}
                        />
                        <div
                          className="w-full bg-[var(--bg-soft)] border-t border-[var(--ink)]/15"
                          style={{ height: `${100 - height}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--ink-soft)]">{m.label}</span>
                      <span className="text-[9px] font-mono">{m.done}/{m.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-4 shadow-brutal-sm">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-3">每日完成情况</div>
              <div className="flex items-end justify-between h-32 gap-1">
                {dayStatsList.map((d, i) => {
                  const maxTotal = Math.max(...dayStatsList.map((x) => x.total), 1);
                  const height = d.total > 0 ? (d.done / maxTotal) * 100 : 0;
                  const label = period === 'day' ? cnDate(d.date) :
                    period === 'week' ? ['日', '一', '二', '三', '四', '五', '六'][new Date(d.date).getDay()] :
                    String(i + 1);
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-24 flex flex-col-reverse">
                        <div
                          className="w-full bg-[var(--terracotta)] rounded-t-sm transition-all"
                          style={{ height: `${height}%` }}
                        />
                        <div
                          className="w-full bg-[var(--bg-soft)] border-t border-[var(--ink)]/15"
                          style={{ height: `${100 - height}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--ink-soft)]">{label}</span>
                      <span className="text-[9px] font-mono">{d.done}/{d.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-4 shadow-brutal-sm">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-3">近7天趋势</div>
            <div className="flex items-end justify-between h-28 gap-2">
              {recent7Days.map((d) => {
                const maxTotal = Math.max(...recent7Days.map((x) => x.total), 1);
                const height = d.total > 0 ? (d.done / maxTotal) * 100 : 0;
                const isToday = d.date === today;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full h-20 flex flex-col-reverse">
                      <div
                        className={clsx('w-full rounded-t-sm transition-all', isToday ? 'bg-[var(--teal)]' : 'bg-[var(--terracotta)]')}
                        style={{ height: `${height}%` }}
                      />
                      <div
                        className="w-full bg-[var(--bg-soft)] border-t border-[var(--ink)]/15"
                        style={{ height: `${100 - height}%` }}
                      />
                    </div>
                    <span className={clsx('text-[10px] font-mono', isToday ? 'text-[var(--teal)] font-bold' : 'text-[var(--ink-soft)]')}>
                      {cnDate(d.date, 'M/d')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-4 shadow-brutal-sm">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-3">累计统计</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-2 bg-[var(--bg-soft)] rounded-md">
                <div className="text-[10px] font-mono text-[var(--ink-soft)]">创建计划</div>
                <div className="font-display text-xl font-bold">{allTimeStats.totalPlans}</div>
              </div>
              <div className="p-2 bg-[var(--bg-soft)] rounded-md">
                <div className="text-[10px] font-mono text-[var(--ink-soft)]">完成次数</div>
                <div className="font-display text-xl font-bold text-[var(--teal)]">{allTimeStats.totalCompletedDates}</div>
              </div>
              <div className="p-2 bg-[var(--bg-soft)] rounded-md">
                <div className="text-[10px] font-mono text-[var(--ink-soft)]">平均时长</div>
                <div className="font-display text-xl font-bold">{formatDuration(allTimeStats.avgDuration)}</div>
              </div>
              <div className="p-2 bg-[var(--bg-soft)] rounded-md">
                <div className="text-[10px] font-mono text-[var(--ink-soft)]">活动天数</div>
                <div className="font-display text-xl font-bold">{new Set(plans.flatMap((p) => p.completedDates)).size}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}