// 数据模型类型定义

export type PlanType = 'meal' | 'study' | 'workout' | 'other';

// 时段分区
export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export const TIME_SLOTS: { key: TimeSlot; label: string; emoji: string; range: string }[] = [
  { key: 'morning',   label: '上午', emoji: '🌅', range: '06:00 - 12:00' },
  { key: 'afternoon', label: '下午', emoji: '☀️', range: '12:00 - 18:00' },
  { key: 'evening',   label: '晚上', emoji: '🌙', range: '18:00 - 23:00' },
];

export function slotFromTime(hour: number): TimeSlot {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'weekdays' | 'custom';

export type TaskCategory = 'routine' | 'todo';

// 待办优先级
export type TodoPriority = 'high' | 'medium' | 'low';

export const PRIORITY_META: Record<TodoPriority, { label: string; emoji: string; color: string; weight: number }> = {
  high:   { label: '高', emoji: '🔴', color: 'text-red-600',     weight: 0 },
  medium: { label: '中', emoji: '🟡', color: 'text-amber-500',    weight: 1 },
  low:    { label: '低', emoji: '🟢', color: 'text-emerald-500',  weight: 2 },
};

export interface Recurrence {
  type: RecurrenceType;
  daysOfWeek?: number[]; // 0 = 周日, 1 = 周一, ..., 6 = 周六
}

export interface Reminder {
  enabled: boolean;
  offsetMinutes: number; // 提前多少分钟提醒
}

export interface PlanItem {
  id: string;
  title: string;
  type: PlanType;
  category: TaskCategory; // routine: 日常任务, todo: 临时待办
  priority?: TodoPriority; // 待办优先级, 仅 todo 类别使用
  slot: TimeSlot; // 用户选择的时段分区
  startTime: string; // ISO 8601, 任务的实际起始时间(包含日期)
  endTime: string;   // ISO 8601, 对于 todo 为截止时间
  note?: string;
  reminder?: Reminder;
  recurrence?: Recurrence;
  // 完成的日期(YYYY-MM-DD)。对于重复任务,记录每次实例的完成情况
  completedDates: string[];
  createdAt: string;
  updatedAt: string;
}

export type AchievementTriggerType = 'completions' | 'streak' | 'xp' | 'todo' | 'level';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide-react 图标名
  unlockedAt: string | null;
  threshold: number; // 达成条件数值
  category: 'streak' | 'completion' | 'variety' | 'consistency' | 'level' | 'todo' | 'todo-high' | 'time' | 'type-master' | 'goal' | 'xp' | 'comeback' | 'custom';
  triggerType?: AchievementTriggerType; // 自定义成就的触发类型
  isCustom?: boolean; // 是否为自定义成就
}

export interface Streak {
  current: number;
  longest: number;
  lastCheckInDate: string | null; // YYYY-MM-DD
}

// 经验值系统
export interface Experience {
  level: number;
  currentXP: number;
  totalXP: number;
}

// 等级标题
export const LEVEL_TITLES: Record<number, string> = {
  1:  '新手小白',
  2:  '初露锋芒',
  3:  '勤能补拙',
  4:  '渐入佳境',
  5:  '小有成就',
  6:  '稳步前行',
  7:  '厚积薄发',
  8:  '出类拔萃',
  9:  '登堂入室',
  10: '炉火纯青',
  11: '融会贯通',
  12: '自成一派',
  13: '超凡脱俗',
  14: '登峰造极',
  15: '一代宗师',
};

// 获取等级所需经验值: base * multiplier^(level-1)
export function getXPForNextLevel(currentLevel: number): number {
  const BASE_XP = 100;
  const MULTIPLIER = 1.5;
  return Math.round(BASE_XP * Math.pow(MULTIPLIER, currentLevel - 1));
}

// 获取等级标题
export function getLevelTitle(level: number): string {
  if (LEVEL_TITLES[level]) return LEVEL_TITLES[level];
  if (level > 15) return `传说${level - 15}`;
  return '新手小白';
}

// 任务完成奖励经验值
export const XP_REWARDS = {
  // 日常任务
  routine: {
    base: 10,
    perfectDayBonus: 50,
  },
  // 待办任务 - 根据优先级奖励
  todo: {
    low: 15,
    medium: 25,
    high: 40,
  },
  // 连续打卡奖励
  streak: {
    day3: 30,
    day7: 70,
    day30: 300,
  },
};

export const DEFAULT_EXPERIENCE: Experience = {
  level: 1,
  currentXP: 0,
  totalXP: 0,
};

export interface UserPreferences {
  theme: 'light' | 'dark' | 'paper';
  reminderSound: boolean;
  timezone: string;
  weekStart: 0 | 1; // 0 = 周日, 1 = 周一
  notificationsEnabled: boolean;
}

export interface GistPayload {
  version: 1;
  plans: PlanItem[];
  achievements: Achievement[];
  preferences: UserPreferences;
  streak: Streak;
  experience: Experience;
  updatedAt: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'paper',
  reminderSound: true,
  timezone: 'Asia/Shanghai',
  weekStart: 1,
  notificationsEnabled: false,
};

export const DEFAULT_STREAK: Streak = {
  current: 0,
  longest: 0,
  lastCheckInDate: null,
};

export const PLAN_TYPE_META: Record<PlanType, { label: string; color: string; emoji: string }> = {
  meal:    { label: '饮食', color: 'meal-color',    emoji: '🍳' },
  study:   { label: '学习', color: 'study-color',   emoji: '📚' },
  workout: { label: '锻炼', color: 'workout-color', emoji: '💪' },
  other:   { label: '其他', color: 'other-color',   emoji: '✦' },
};
