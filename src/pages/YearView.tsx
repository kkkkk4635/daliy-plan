import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfYear, endOfYear, addYears, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO, ymd, cnDate, WEEKDAY_CN, isSameYear } from '../utils/date';
import { useScheduleStore } from '../store/useScheduleStore';
import { useNavigate } from 'react-router-dom';
import { PLAN_TYPE_META } from '../types';
import type { PlanItem } from '../types';
import clsx from 'clsx';

export function YearView() {
  const navigate = useNavigate();
  const plans = useScheduleStore((s) => s.plans);
  const setSelectedDate = useScheduleStore((s) => s.setSelectedDate);
  const preferences = useScheduleStore((s) => s.preferences);
  const [yearAnchor, setYearAnchor] = useState(() => startOfYear(new Date()));

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = startOfMonth(new Date(yearAnchor.getFullYear(), i, 1));
      const monthEnd = endOfMonth(monthStart);
      const weekStart = startOfWeek(monthStart, { weekStartsOn: preferences.weekStart });
      const weekEnd = endOfWeek(monthEnd, { weekStartsOn: preferences.weekStart });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      result.push({ monthStart, days });
    }
    return result;
  }, [yearAnchor, preferences.weekStart]);

  const plansByDate = useMemo(() => {
    const map = new Map<string, PlanItem[]>();
    plans.filter((p) => p.category === 'routine').forEach((p) => {
      const start = parseISO(p.startTime);
      if (!isSameYear(start, yearAnchor)) return;
      if (!p.recurrence || p.recurrence.type === 'none') {
        const key = ymd(start);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
        return;
      }
      const yearStart = startOfYear(yearAnchor);
      const yearEnd = endOfYear(yearAnchor);
      let cur = new Date(Math.max(start.getTime(), yearStart.getTime()));
      cur.setHours(0, 0, 0, 0);
      while (cur <= yearEnd) {
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
  }, [plans, yearAnchor]);

  const today = new Date();

  const handleMonthClick = (monthStart: Date) => {
    setSelectedDate(ymd(monthStart));
    navigate('/month');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 lg:px-8 py-4 border-b-2 border-[var(--ink)] flex items-center gap-3 bg-[var(--bg-soft)]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYearAnchor(addYears(yearAnchor, -1))}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] shadow-brutal-sm"
            aria-label="上一年"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setYearAnchor(addYears(yearAnchor, 1))}
            className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] shadow-brutal-sm"
            aria-label="下一年"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">year</div>
          <div className="font-display text-xl font-bold truncate">{yearAnchor.getFullYear()} 年</div>
        </div>
        <button
          onClick={() => setYearAnchor(startOfYear(new Date()))}
          className="px-3 py-1.5 text-xs font-semibold border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] transition-colors"
        >
          本年
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {months.map(({ monthStart, days }, monthIdx) => (
              <div
                key={monthStart.toISOString()}
                className="border-2 border-[var(--ink)] rounded-md overflow-hidden bg-[var(--bg)] shadow-brutal-sm"
              >
                <div
                  className="px-2 py-1.5 bg-[var(--bg-soft)] border-b-2 border-[var(--ink)] flex items-center justify-between cursor-pointer hover:bg-[var(--terracotta)]/5 transition-colors"
                  onClick={() => handleMonthClick(monthStart)}
                >
                  <span className="font-display font-bold text-sm">{cnDate(monthStart, 'M月')}</span>
                  <span className="text-[10px] font-mono text-[var(--ink-soft)]">{monthStart.getFullYear()}</span>
                </div>
                <div className="grid grid-cols-7 text-center">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const dow = (preferences.weekStart + i) % 7;
                    return (
                      <div
                        key={i}
                        className="py-1 text-[9px] font-mono font-bold text-[var(--ink-soft)]"
                      >
                        {WEEKDAY_CN[dow][0]}
                      </div>
                    );
                  })}
                  {days.map((d) => {
                    const inMonth = isSameMonth(d, monthStart);
                    const isToday = isSameDay(d, today);
                    const list = plansByDate.get(ymd(d)) || [];
                    const hasPlan = list.length > 0;
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => {
                          setSelectedDate(ymd(d));
                          navigate('/');
                        }}
                        className={clsx(
                          'aspect-square flex flex-col items-center justify-center text-[10px] font-mono transition-all',
                          !inMonth && 'opacity-30',
                          isToday && 'bg-[var(--terracotta)] text-white',
                          hasPlan && !isToday && 'text-[var(--terracotta)] font-bold'
                        )}
                      >
                        <span>{d.getDate()}</span>
                        {hasPlan && (
                          <span className="w-1 h-1 rounded-full bg-[var(--terracotta)] mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}