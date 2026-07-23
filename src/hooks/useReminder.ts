// 提醒调度 - 每分钟检查即将到期的计划
import { useEffect, useRef } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { parseISO, isAfter, isBefore, addMinutes, ymd, isPlanActiveOnDate } from '../utils/date';
import { notify, playBeep } from '../utils/notify';

const NOTIFIED_KEY = 'notified-reminders';

function loadNotified(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveNotified(set: Set<string>) {
  try {
    sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function useReminderScheduler() {
  const plans = useScheduleStore((s) => s.plans);
  const prefs = useScheduleStore((s) => s.preferences);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!prefs.notificationsEnabled) return;
    const tick = () => {
      const now = Date.now();
      // 同一分钟只检查一次
      if (now - lastCheckRef.current < 30 * 1000) return;
      lastCheckRef.current = now;
      checkReminders(plans);
    };
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, [plans, prefs.notificationsEnabled]);
}

function checkReminders(plans: ReturnType<typeof useScheduleStore.getState>['plans']) {
  const today = new Date();
  const notified = loadNotified();
  plans.forEach((p) => {
    if (!p.reminder?.enabled) return;

    // 待办任务(todo)：提醒基于截止时间(endTime)
    if (p.category === 'todo') {
      const deadline = parseISO(p.endTime);
      const reminderTime = addMinutes(deadline, -p.reminder.offsetMinutes);
      const now = new Date();
      // 在提醒时间后5分钟窗口内触发
      if (isAfter(now, reminderTime) && isBefore(now, addMinutes(reminderTime, 5))) {
        const key = `todo-${p.id}-${p.reminder.offsetMinutes}`;
        if (notified.has(key)) return;
        notified.add(key);
        saveNotified(notified);
        const offsetText = p.reminder.offsetMinutes === 0
          ? '已到截止时间'
          : p.reminder.offsetMinutes < 60
            ? `截止前 ${p.reminder.offsetMinutes} 分钟`
            : p.reminder.offsetMinutes < 1440
              ? `截止前 ${Math.floor(p.reminder.offsetMinutes / 60)} 小时`
              : `截止前 ${Math.floor(p.reminder.offsetMinutes / 1440)} 天`;
        notify(`⏰ ${p.title}`, `${offsetText}，请尽快处理！`, `reminder-${p.id}`);
      }
      return;
    }

    // 日常任务(routine)：提醒基于开始时间(startTime)
    if (!isPlanActiveOnDate(p, today)) return;
    const start = parseISO(p.startTime);
    const instance = new Date(today);
    instance.setHours(start.getHours(), start.getMinutes(), 0, 0);
    const reminderTime = addMinutes(instance, -p.reminder.offsetMinutes);
    const now = new Date();
    if (isAfter(now, reminderTime) && isBefore(now, addMinutes(reminderTime, 5))) {
      const key = `${p.id}-${ymd(today)}-${p.reminder.offsetMinutes}`;
      if (notified.has(key)) return;
      notified.add(key);
      saveNotified(notified);
      const minText = p.reminder.offsetMinutes === 0 ? '现在' : `${p.reminder.offsetMinutes} 分钟后`;
      notify(`⏰ ${p.title}`, `${minText}开始,记得准时执行!`, `reminder-${p.id}`);
    }
  });
}
