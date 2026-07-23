// 日期辅助函数
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addMinutes,
  addMonths,
  addYears,
  addWeeks,
  isSameDay,
  isSameWeek,
  isWithinInterval,
  eachDayOfInterval,
  getDay,
  getDate,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isSameMonth,
  isSameYear,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { PlanItem, Recurrence } from '../types';

export {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addMinutes,
  addMonths,
  addYears,
  addWeeks,
  isSameDay,
  isSameWeek,
  isWithinInterval,
  eachDayOfInterval,
  getDay,
  getDate,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isSameMonth,
  isSameYear,
};

export const zhLocale = zhCN;

export const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export const WEEKDAY_CN_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export function ymd(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function hm(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
}

export function cnDate(date: Date | string, pattern = 'M月d日'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern, { locale: zhCN });
}

export function setTime(base: Date, hours: number, minutes: number = 0): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(base, hours), minutes), 0), 0);
}

// 判断某个计划在指定日期是否生效
export function isPlanActiveOnDate(plan: PlanItem, date: Date): boolean {
  const targetYmd = ymd(date);
  const startYmd = ymd(plan.startTime);
  // 如果还没到开始日期
  if (targetYmd < startYmd) return false;

  // 单次任务
  if (!plan.recurrence || plan.recurrence.type === 'none') {
    return targetYmd === startYmd;
  }

  // 重复任务
  return isRecurrenceHitOnDate(plan.recurrence, plan.startTime, date);
}

function isRecurrenceHitOnDate(rec: Recurrence, startTime: string, date: Date): boolean {
  const start = parseISO(startTime);
  switch (rec.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return getDay(date) >= 1 && getDay(date) <= 5;
    case 'weekly': {
      const days = rec.daysOfWeek && rec.daysOfWeek.length > 0 ? rec.daysOfWeek : [getDay(start)];
      return days.includes(getDay(date));
    }
    case 'custom': {
      if (!rec.daysOfWeek || rec.daysOfWeek.length === 0) return false;
      return rec.daysOfWeek.includes(getDay(date));
    }
    default:
      return false;
  }
}

// 计划在指定日期的具体时间
export function planInstanceStart(plan: PlanItem, date: Date): Date {
  const base = parseISO(plan.startTime);
  return setTime(date, base.getHours(), base.getMinutes());
}

export function planInstanceEnd(plan: PlanItem, date: Date): Date {
  const base = parseISO(plan.endTime);
  return setTime(date, base.getHours(), base.getMinutes());
}

// 判断计划实例在指定时段内是否与某个时间槽重叠
export function isPlanInTimeSlot(
  plan: PlanItem,
  date: Date,
  slotStart: Date,
  slotEnd: Date
): boolean {
  if (!isPlanActiveOnDate(plan, date)) return false;
  const start = planInstanceStart(plan, date);
  const end = planInstanceEnd(plan, date);
  return start < slotEnd && end > slotStart;
}

// 计划在指定日期是否已完成
export function isPlanCompletedOnDate(plan: PlanItem, date: Date): boolean {
  return plan.completedDates.includes(ymd(date));
}

// 计划时长(分钟)
export function planDurationMinutes(plan: PlanItem): number {
  const start = parseISO(plan.startTime);
  const end = parseISO(plan.endTime);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

// 友好的相对时间
export function relativeTime(iso: string): string {
  const target = parseISO(iso);
  const now = new Date();
  const diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
  if (Math.abs(diffMin) < 1) return '刚刚';
  if (diffMin > 0 && diffMin < 60) return `${diffMin} 分钟后`;
  if (diffMin < 0 && diffMin > -60) return `${-diffMin} 分钟前`;
  if (diffMin >= 60 && diffMin < 24 * 60) return `${Math.floor(diffMin / 60)} 小时 ${diffMin % 60} 分后`;
  if (diffMin <= -60 && diffMin > -24 * 60) return `${Math.floor(-diffMin / 60)} 小时前`;
  return cnDate(iso, 'M-d HH:mm');
}
