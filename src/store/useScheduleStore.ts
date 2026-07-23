// Zustand store - 全局应用状态
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  PlanItem,
  Achievement,
  Streak,
  UserPreferences,
  PlanType,
  TimeSlot,
  Recurrence,
  Reminder,
  TaskCategory,
  TodoPriority,
  Experience,
  AchievementTriggerType,
} from '../types';
import { DEFAULT_PREFERENCES, DEFAULT_STREAK, DEFAULT_EXPERIENCE, getXPForNextLevel } from '../types';
import {
  getAllPlans,
  savePlan,
  deletePlan as dbDeletePlan,
  getMeta,
  setMeta,
  initMeta,
} from '../utils/idb';
import { isSameDay, ymd, isPlanActiveOnDate, isPlanCompletedOnDate, addDays, parseISO } from '../utils/date';

interface ScheduleState {
  plans: PlanItem[];
  preferences: UserPreferences;
  streak: Streak;
  achievements: Achievement[];
  experience: Experience;
  selectedDate: string; // YYYY-MM-DD 当前查看的日期
  initialized: boolean;

  init: () => Promise<void>;
  setSelectedDate: (d: string) => void;
  goToday: () => void;
  shiftDate: (days: number) => void;

  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;

  createPlan: (input: NewPlanInput) => Promise<PlanItem>;
  updatePlan: (id: string, patch: Partial<PlanItem>) => Promise<void>;
  removePlan: (id: string) => Promise<void>;
  toggleComplete: (id: string, date: string) => Promise<void>;

  addXP: (amount: number) => void;
  setExperience: (e: Experience) => void;

  setPlans: (plans: PlanItem[]) => void;
  setAchievements: (a: Achievement[]) => void;
  addCustomAchievement: (title: string, description: string, icon: string, threshold: number, triggerType: AchievementTriggerType) => void;
  removeCustomAchievement: (id: string) => void;
  setStreak: (s: Streak) => void;
  setPreferences: (p: UserPreferences) => void;
}

export interface NewPlanInput {
  title: string;
  type: PlanType;
  category: TaskCategory;
  priority?: TodoPriority;
  slot: TimeSlot;
  startTime: string;
  endTime: string;
  note?: string;
  reminder?: Reminder;
  recurrence?: Recurrence;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  plans: [],
  preferences: DEFAULT_PREFERENCES,
  streak: DEFAULT_STREAK,
  achievements: [],
  experience: DEFAULT_EXPERIENCE,
  selectedDate: ymd(new Date()),
  initialized: false,

  init: async () => {
    await initMeta();
    const [plans, prefs, streak, achievements, experience] = await Promise.all([
      getAllPlans(),
      getMeta<UserPreferences>('preferences').then((p) => p || DEFAULT_PREFERENCES),
      getMeta<Streak>('streak').then((s) => s || DEFAULT_STREAK),
      getMeta<Achievement[]>('achievements').then((a) => a || []),
      getMeta<Experience>('experience').then((e) => e || DEFAULT_EXPERIENCE),
    ]);
    set({ plans, preferences: prefs, streak, achievements, experience, initialized: true });
  },

  setSelectedDate: (d) => set({ selectedDate: d }),
  goToday: () => set({ selectedDate: ymd(new Date()) }),
  shiftDate: (days) => {
    const cur = parseISO(get().selectedDate);
    set({ selectedDate: ymd(addDays(cur, days)) });
  },

  updatePreferences: async (patch) => {
    const next = { ...get().preferences, ...patch };
    await setMeta('preferences', next);
    set({ preferences: next });
  },

  createPlan: async (input) => {
    const now = new Date().toISOString();
    const plan: PlanItem = {
      id: uuid(),
      title: input.title.trim(),
      type: input.type,
      category: input.category,
      priority: input.priority,
      slot: input.slot,
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note?.trim() || undefined,
      reminder: input.reminder,
      recurrence: input.recurrence,
      completedDates: [],
      createdAt: now,
      updatedAt: now,
    };
    await savePlan(plan);
    set({ plans: [...get().plans, plan] });
    return plan;
  },

  updatePlan: async (id, patch) => {
    const plans = get().plans;
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const next: PlanItem = { ...plans[idx], ...patch, updatedAt: new Date().toISOString() };
    await savePlan(next);
    const newPlans = [...plans];
    newPlans[idx] = next;
    set({ plans: newPlans });
  },

  removePlan: async (id) => {
    await dbDeletePlan(id);
    set({ plans: get().plans.filter((p) => p.id !== id) });
  },

  toggleComplete: async (id, date) => {
    const plans = get().plans;
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const plan = plans[idx];
    const completed = plan.completedDates.includes(date);
    const newDates = completed
      ? plan.completedDates.filter((d) => d !== date)
      : [...plan.completedDates, date];
    const next: PlanItem = { ...plan, completedDates: newDates, updatedAt: new Date().toISOString() };
    await savePlan(next);
    const newPlans = [...plans];
    newPlans[idx] = next;
    set({ plans: newPlans });

    if (!completed) {
      const addXP = get().addXP;
      if (plan.category === 'routine') {
        addXP(10);
      } else if (plan.category === 'todo') {
        const priority = plan.priority || 'medium';
        const xp = priority === 'high' ? 40 : priority === 'medium' ? 25 : 15;
        addXP(xp);
      }
    }
  },

  addXP: (amount) => {
    const { experience } = get();
    let { level, currentXP, totalXP } = experience;
    currentXP += amount;
    totalXP += amount;

    const xpNeeded = getXPForNextLevel(level);
    while (currentXP >= xpNeeded) {
      currentXP -= xpNeeded;
      level += 1;
    }

    const next: Experience = { level, currentXP, totalXP };
    set({ experience: next });
    void setMeta('experience', next);
  },

  setExperience: (e) => {
    set({ experience: e });
    void setMeta('experience', e);
  },

  setPlans: (plans) => set({ plans }),
  setAchievements: (achievements) => set({ achievements }),

  addCustomAchievement: (title, description, icon, threshold, triggerType) => {
    const achievement: Achievement = {
      id: uuid(),
      title: title.trim(),
      description: description.trim(),
      icon,
      unlockedAt: null,
      threshold,
      category: 'custom',
      triggerType,
      isCustom: true,
    };
    const updated = [...get().achievements, achievement];
    set({ achievements: updated });
    void setMeta('achievements', updated);
  },

  removeCustomAchievement: (id) => {
    const updated = get().achievements.filter((a) => a.id !== id);
    set({ achievements: updated });
    void setMeta('achievements', updated);
  },

  setStreak: (streak) => set({ streak }),
  setPreferences: (preferences) => set({ preferences }),
}));

// 派生:给定日期的当日计划（按分区→开始时间→结束时间排序）
const SLOT_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 };

export function getActivePlansForDate(state: ScheduleState, date: Date): PlanItem[] {
  return state.plans
    .filter((p) => isPlanActiveOnDate(p, date))
    .sort((a, b) => {
      const sa = SLOT_ORDER[a.slot ?? 'morning'] ?? 0;
      const sb = SLOT_ORDER[b.slot ?? 'morning'] ?? 0;
      if (sa !== sb) return sa - sb;
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.endTime.localeCompare(b.endTime);
    });
}

// 派生:当日完成进度
export function getDayProgress(state: ScheduleState, date: Date): { done: number; total: number } {
  const active = getActivePlansForDate(state, date);
  const done = active.filter((p) => isPlanCompletedOnDate(p, date)).length;
  return { done, total: active.length };
}

// 派生:今日是否完成全部
export function isDayPerfect(state: ScheduleState, date: Date): boolean {
  const { done, total } = getDayProgress(state, date);
  return total > 0 && done === total;
}
