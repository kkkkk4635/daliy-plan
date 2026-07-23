import { NavLink, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CalendarRange,
  Calendar,
  Trophy,
  Settings,
  Flame,
  BookOpen,
  BarChart3,
  ChevronDown,
  CheckSquare,
  Target,
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { getDayProgress } from '../store/useScheduleStore';
import { ymd, parseISO, isSameDay, isPlanCompletedOnDate, isPlanActiveOnDate } from '../utils/date';

const navItems = [
  { to: '/', label: '日程', icon: CalendarDays, end: true },
  { to: '/todo', label: '待办', icon: CheckSquare },
  { to: '/goals', label: '目标', icon: Target },
  { to: '/statistics', label: '统计', icon: BarChart3 },
  { to: '/achievements', label: '成就', icon: Trophy },
  { to: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const plans = useScheduleStore((s) => s.plans);
  const streak = useScheduleStore((s) => s.streak);
  const location = useLocation();
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const today = new Date();
  const todayYmd = ymd(today);
  const active = plans.filter((p) => isPlanActiveOnDate(p, today));
  const done = plans.filter((p) => isPlanActiveOnDate(p, today) && isPlanCompletedOnDate(p, today)).length;
  const total = active.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const isScheduleActive = ['/', '/week', '/month', '/year'].includes(location.pathname);

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r-2 border-[var(--ink)] bg-[var(--bg)] h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b-2 border-[var(--ink)]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-md bg-[var(--terracotta)] border-2 border-[var(--ink)] flex items-center justify-center shadow-brutal-sm">
            <BookOpen size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-2xl font-bold leading-none">课表</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mt-0.5">
              daily · planner
            </div>
          </div>
        </div>
      </div>

      {/* 进度卡 */}
      <div className="px-4 py-4 border-b-2 border-[var(--ink)]">
        <div className="bg-[var(--bg-soft)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
              今日进度
            </span>
            <span className="text-xs font-mono font-bold text-[var(--terracotta)]">
              {done}/{total}
            </span>
          </div>
          <div className="h-2 bg-[var(--bg)] border-2 border-[var(--ink)] rounded-sm overflow-hidden">
            <div
              className="h-full bg-[var(--terracotta)] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <Flame
              size={16}
              className={clsx(
                'text-[var(--terracotta)]',
                streak.current > 0 && 'animate-flame-flicker'
              )}
            />
            <span className="text-xs font-semibold">
              连续 <span className="text-[var(--terracotta)] font-bold">{streak.current}</span> 天
            </span>
            {streak.longest > 0 && (
              <span className="text-[10px] text-[var(--ink-soft)] ml-auto font-mono">
                最长 {streak.longest}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.to === '/') {
            return (
              <div key={item.to} className="relative">
                <button
                  onClick={() => setShowScheduleMenu(!showScheduleMenu)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold text-sm transition-all',
                    isScheduleActive
                      ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm'
                      : 'text-[var(--ink)] hover:bg-[var(--bg-soft)]'
                  )}
                >
                  <Icon size={18} strokeWidth={2.5} />
                  {item.label}
                  <ChevronDown
                    size={14}
                    className={clsx('ml-auto transition-transform', showScheduleMenu && 'rotate-180')}
                  />
                </button>
                {showScheduleMenu && (
                  <div className="mt-1 ml-4 space-y-0.5">
                    {[
                      { to: '/', label: '今日', icon: CalendarDays },
                      { to: '/week', label: '本周', icon: CalendarRange },
                      { to: '/month', label: '本月', icon: Calendar },
                      { to: '/year', label: '本年', icon: Calendar },
                    ].map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = location.pathname === sub.to;
                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          onClick={() => setShowScheduleMenu(false)}
                          className={clsx(
                            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                            isActive
                              ? 'bg-[var(--bg-soft)] text-[var(--terracotta)]'
                              : 'text-[var(--ink)] hover:bg-[var(--bg-soft)]'
                          )}
                        >
                          <SubIcon size={14} />
                          {sub.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold text-sm transition-all',
                  isActive
                    ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm'
                    : 'text-[var(--ink)] hover:bg-[var(--bg-soft)]'
                )
              }
            >
              <Icon size={18} strokeWidth={2.5} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* 底部装饰 */}
      <div className="px-6 py-4 border-t-2 border-[var(--ink)] text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
        <div>v 1.0 · zero-backend</div>
        <div className="mt-1 opacity-60">{todayYmd}</div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg)] border-t-2 border-[var(--ink)] flex justify-around py-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        if (item.to === '/') {
          return (
            <div key={item.to} className="relative">
              <select
                className="appearance-none bg-transparent border-none px-2 py-1.5 rounded-md text-[10px] font-semibold text-center focus:outline-none"
                onChange={(e) => {
                  window.location.href = e.target.value;
                }}
                value={window.location.pathname}
              >
                <option value="/">今日</option>
                <option value="/week">本周</option>
                <option value="/month">本月</option>
                <option value="/year">本年</option>
              </select>
            </div>
          );
        }
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-semibold',
                isActive
                  ? 'text-[var(--terracotta)]'
                  : 'text-[var(--ink-soft)]'
              )
            }
          >
            <Icon size={20} strokeWidth={2.5} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function TopBar({ onAdd }: { onAdd: () => void }) {
  const plans = useScheduleStore((s) => s.plans);
  const selectedDate = useScheduleStore((s) => s.selectedDate);
  const streak = useScheduleStore((s) => s.streak);
  const today = new Date();
  const isToday = ymd(today) === selectedDate;
  const active = plans.filter((p) => isPlanActiveOnDate(p, today));
  const done = active.filter((p) => isPlanCompletedOnDate(p, today)).length;

  return (
    <header className="sticky top-0 z-20 bg-[var(--bg)] border-b-2 border-[var(--ink)] px-4 lg:px-8 py-3 flex items-center gap-3 backdrop-blur-sm">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
          {isToday ? 'today' : 'viewing'}
        </div>
        <div className="font-display text-lg lg:text-xl font-bold truncate">
          {isToday ? '今日课表' : `${selectedDate}`}
        </div>
      </div>
      <div className="hidden md:flex items-center gap-2 text-xs font-mono">
        <span className="text-[var(--ink-soft)]">完成</span>
        <span className="font-bold text-[var(--terracotta)]">{done}</span>
        <span className="text-[var(--ink-soft)]">/ {active.length}</span>
      </div>
      {streak.current > 0 && (
        <div className="hidden md:flex items-center gap-1 text-xs font-mono bg-[var(--bg-soft)] border-2 border-[var(--ink)] rounded-md px-2 py-1">
          <Flame size={14} className="text-[var(--terracotta)]" />
          <span className="font-bold">{streak.current}</span>
        </div>
      )}
    </header>
  );
}
