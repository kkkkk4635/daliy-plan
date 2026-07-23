// 成就系统 Hook - 检测并解锁成就
import { useEffect } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { setMeta } from '../utils/idb';
import { isPlanCompletedOnDate, ymd, isPlanActiveOnDate, parseISO, isSameDay, addDays, differenceInCalendarDays } from '../utils/date';
import type { Achievement, PlanItem } from '../types';

// 预定义成就列表
export const ACHIEVEMENT_TEMPLATES: Omit<Achievement, 'unlockedAt'>[] = [
  // 连续打卡
  { id: 'streak-3',    title: '小小火苗',   description: '连续打卡 3 天',              icon: 'Flame',           threshold: 3,   category: 'streak' },
  { id: 'streak-7',    title: '一周不息',   description: '连续打卡 7 天',              icon: 'Flame',           threshold: 7,   category: 'streak' },
  { id: 'streak-14',   title: '两周坚持',   description: '连续打卡 14 天',             icon: 'Flame',           threshold: 14,  category: 'streak' },
  { id: 'streak-30',   title: '月度冠军',   description: '连续打卡 30 天',             icon: 'Trophy',          threshold: 30,  category: 'streak' },
  { id: 'streak-60',   title: '双月不休',   description: '连续打卡 60 天',             icon: 'Trophy',          threshold: 60,  category: 'streak' },
  { id: 'streak-100',  title: '百日筑基',   description: '连续打卡 100 天',            icon: 'Award',           threshold: 100, category: 'streak' },
  { id: 'streak-200',  title: '铁人意志',   description: '连续打卡 200 天',            icon: 'Award',           threshold: 200, category: 'streak' },
  { id: 'streak-365',  title: '全年无休',   description: '连续打卡 365 天',            icon: 'Crown',           threshold: 365, category: 'streak' },
  // 单日完成
  { id: 'day-perfect-1',   title: '完美一天',   description: '首次单日完成 100% 计划',  icon: 'CheckCircle',     threshold: 1,   category: 'completion' },
  { id: 'day-perfect-7',   title: '一周完美',   description: '累计 7 天单日 100% 完成', icon: 'CheckCircle2',    threshold: 7,   category: 'completion' },
  { id: 'day-perfect-30',  title: '完美月度',   description: '累计 30 天单日 100% 完成',icon: 'CheckCircle2',    threshold: 30,  category: 'completion' },
  { id: 'day-perfect-100', title: '完美达人',   description: '累计 100 天单日 100%',    icon: 'CheckCircle2',    threshold: 100, category: 'completion' },
  // 类型丰富
  { id: 'variety-3',  title: '平衡生活',   description: '同日完成 3 种类型计划',       icon: 'Sparkles',        threshold: 3,  category: 'variety' },
  { id: 'variety-4',  title: '面面俱到',   description: '同日完成 4 种类型计划',       icon: 'Stars',           threshold: 4,  category: 'variety' },
  // 累计完成
  { id: 'total-10',   title: '初窥门径',   description: '累计完成 10 个计划实例',     icon: 'Target',          threshold: 10,   category: 'consistency' },
  { id: 'total-50',   title: '渐入佳境',   description: '累计完成 50 个计划实例',     icon: 'Target',          threshold: 50,   category: 'consistency' },
  { id: 'total-100',  title: '百炼成钢',   description: '累计完成 100 个计划实例',    icon: 'Crown',           threshold: 100,  category: 'consistency' },
  { id: 'total-300',  title: '三百精锐',   description: '累计完成 300 个计划实例',    icon: 'Crown',           threshold: 300,  category: 'consistency' },
  { id: 'total-500',  title: '千锤百炼',   description: '累计完成 500 个计划实例',    icon: 'Gem',              threshold: 500,  category: 'consistency' },
  { id: 'total-1000', title: '登峰造极',   description: '累计完成 1000 个计划实例',   icon: 'Diamond',          threshold: 1000, category: 'consistency' },
  { id: 'total-2000', title: '传说之人',   description: '累计完成 2000 个计划实例',   icon: 'Diamond',          threshold: 2000, category: 'consistency' },
  // 等级成就
  { id: 'level-1',    title: '踏上征程',   description: '达到 1 级',                  icon: 'Star',            threshold: 1,    category: 'level' },
  { id: 'level-3',    title: '崭露头角',   description: '达到 3 级',                  icon: 'Star',            threshold: 3,    category: 'level' },
  { id: 'level-5',    title: '小有成就',   description: '达到 5 级',                  icon: 'Star',            threshold: 5,    category: 'level' },
  { id: 'level-10',   title: '炉火纯青',   description: '达到 10 级',                 icon: 'StarHalf',        threshold: 10,   category: 'level' },
  { id: 'level-15',   title: '一代宗师',   description: '达到 15 级',                 icon: 'StarHalf',        threshold: 15,   category: 'level' },
  { id: 'level-20',   title: '超凡入圣',   description: '达到 20 级',                 icon: 'StarHalf',        threshold: 20,   category: 'level' },
  // 待办成就
  { id: 'todo-first',  title: '初战告捷',   description: '完成第一个待办',            icon: 'ClipboardCheck',  threshold: 1,    category: 'todo' },
  { id: 'todo-5',      title: '小有斩获',   description: '累计完成 5 个待办',        icon: 'ListChecks',      threshold: 5,    category: 'todo' },
  { id: 'todo-10',     title: '待办达人',   description: '累计完成 10 个待办',        icon: 'ListChecks',      threshold: 10,   category: 'todo' },
  { id: 'todo-50',     title: '待办大师',   description: '累计完成 50 个待办',        icon: 'ListChecks',      threshold: 50,   category: 'todo' },
  { id: 'todo-100',    title: '待办传说',   description: '累计完成 100 个待办',       icon: 'ListChecks',      threshold: 100,  category: 'todo' },
  // 高优待办
  { id: 'todo-high',    title: '临危不乱',   description: '完成首个高优先级待办',      icon: 'AlertTriangle',   threshold: 1,    category: 'todo-high' },
  { id: 'todo-high-10', title: '急先锋',     description: '完成 10 个高优先级待办',   icon: 'AlertTriangle',   threshold: 10,   category: 'todo-high' },
  { id: 'todo-high-30', title: '危机克星',   description: '完成 30 个高优先级待办',   icon: 'AlertTriangle',   threshold: 30,   category: 'todo-high' },
  // 时段成就
  { id: 'early-bird',   title: '早起的鸟儿', description: '在上午时段完成 10 个任务',  icon: 'Sunrise',         threshold: 10,   category: 'time' },
  { id: 'early-bird-50',title: '晨间大师',   description: '在上午时段完成 50 个任务',  icon: 'Sunrise',         threshold: 50,   category: 'time' },
  { id: 'afternoon',    title: '午后达人',   description: '在下午时段完成 10 个任务',  icon: 'Sun',             threshold: 10,   category: 'time' },
  { id: 'afternoon-50', title: '午后大师',   description: '在下午时段完成 50 个任务',  icon: 'Sun',             threshold: 50,   category: 'time' },
  { id: 'night-owl',    title: '夜猫子',     description: '在晚上时段完成 10 个任务',  icon: 'Moon',            threshold: 10,   category: 'time' },
  { id: 'night-owl-50', title: '夜间大师',   description: '在晚上时段完成 50 个任务',  icon: 'Moon',            threshold: 50,   category: 'time' },
  // 类型大师 - 单类型累计
  { id: 'meal-30',      title: '饮食规律',   description: '完成 30 个饮食计划',        icon: 'Utensils',        threshold: 30,   category: 'type-master' },
  { id: 'meal-100',     title: '美食家',     description: '完成 100 个饮食计划',       icon: 'Utensils',        threshold: 100,  category: 'type-master' },
  { id: 'study-30',     title: '勤学不辍',   description: '完成 30 个学习计划',        icon: 'BookOpen',        threshold: 30,   category: 'type-master' },
  { id: 'study-100',    title: '学霸',       description: '完成 100 个学习计划',       icon: 'BookOpen',        threshold: 100,  category: 'type-master' },
  { id: 'workout-30',   title: '健身达人',   description: '完成 30 个运动计划',        icon: 'Dumbbell',        threshold: 30,   category: 'type-master' },
  { id: 'workout-100',  title: '健身狂人',   description: '完成 100 个运动计划',        icon: 'Dumbbell',        threshold: 100,  category: 'type-master' },
  { id: 'other-30',     title: '杂事管家',   description: '完成 30 个其他计划',        icon: 'ClipboardList',   threshold: 30,   category: 'type-master' },
  { id: 'other-100',    title: '万事通',     description: '完成 100 个其他计划',        icon: 'ClipboardList',   threshold: 100,  category: 'type-master' },
  // 经验值成就
  { id: 'xp-100',   title: '初拾经验', description: '累计获得 100 XP',  icon: 'Zap',  threshold: 100,  category: 'xp' },
  { id: 'xp-500',   title: '经验积累', description: '累计获得 500 XP',  icon: 'Zap',  threshold: 500,  category: 'xp' },
  { id: 'xp-1000',  title: '经验富足', description: '累计获得 1000 XP', icon: 'Zap',  threshold: 1000, category: 'xp' },
  { id: 'xp-5000',  title: '经验之海', description: '累计获得 5000 XP',  icon: 'Zap',  threshold: 5000, category: 'xp' },
  { id: 'xp-10000', title: '经验至尊', description: '累计获得 10000 XP', icon: 'Zap', threshold: 10000, category: 'xp' },
  // 回归成就
  { id: 'comeback-1', title: '王者归来', description: '中断 3 天后重新打卡', icon: 'RefreshCw', threshold: 1, category: 'comeback' },
];

function checkStreakAchievements(
  achievements: Achievement[],
  streakCurrent: number
): Achievement[] {
  return achievements.map((a) => {
    if (a.category !== 'streak' || a.unlockedAt) return a;
    if (streakCurrent >= a.threshold) {
      return { ...a, unlockedAt: new Date().toISOString() };
    }
    return a;
  });
}

// 处理 completion / variety / consistency 三类(都基于完成数据)
function checkCompletionAchievements(
  achievements: Achievement[],
  plans: PlanItem[]
): Achievement[] {
  // 收集所有有完成的日期
  const allDates = new Set<string>();
  plans.forEach((p) => p.completedDates.forEach((d) => allDates.add(d)));

  let perfectCount = 0;
  let totalCompleted = 0;
  let maxVariety = 0;

  allDates.forEach((d) => {
    const date = parseISO(d);
    const active = plans.filter((p) => isPlanActiveOnDate(p, date));
    if (active.length === 0) return;
    const done = active.filter((p) => isPlanCompletedOnDate(p, date)).length;
    if (done === active.length) perfectCount += 1;
    totalCompleted += done;
    const typesDone = new Set(
      active.filter((p) => isPlanCompletedOnDate(p, date)).map((p) => p.type)
    );
    if (typesDone.size > maxVariety) maxVariety = typesDone.size;
  });

  return achievements.map((a) => {
    if (a.unlockedAt) return a;
    if (a.category === 'completion' && a.id.startsWith('day-perfect-')) {
      if (perfectCount >= a.threshold) {
        return { ...a, unlockedAt: new Date().toISOString() };
      }
    }
    if (a.category === 'variety') {
      if (maxVariety >= a.threshold) {
        return { ...a, unlockedAt: new Date().toISOString() };
      }
    }
    if (a.category === 'consistency' && a.id.startsWith('total-')) {
      if (totalCompleted >= a.threshold) {
        return { ...a, unlockedAt: new Date().toISOString() };
      }
    }
    return a;
  });
}

// 处理 todo / todo-high 两类
function checkTodoAchievements(
  achievements: Achievement[],
  plans: PlanItem[]
): Achievement[] {
  let todoCompleted = 0;
  let highPriorityCompleted = 0;

  plans.forEach((p) => {
    if (p.category === 'todo') {
      todoCompleted += p.completedDates.length;
      if (p.priority === 'high') {
        highPriorityCompleted += p.completedDates.length;
      }
    }
  });

  return achievements.map((a) => {
    if (a.unlockedAt) return a;
    if (a.category === 'todo' && todoCompleted >= a.threshold) {
      return { ...a, unlockedAt: new Date().toISOString() };
    }
    if (a.category === 'todo-high' && highPriorityCompleted >= a.threshold) {
      return { ...a, unlockedAt: new Date().toISOString() };
    }
    return a;
  });
}

// 等级成就 - 通用比较
function checkLevelAchievements(
  achievements: Achievement[],
  level: number
): Achievement[] {
  return achievements.map((a) => {
    if (a.category !== 'level' || a.unlockedAt) return a;
    if (level >= a.threshold) {
      return { ...a, unlockedAt: new Date().toISOString() };
    }
    return a;
  });
}

// 时段成就 - 按 slot 统计完成次数
function checkTimeAchievements(
  achievements: Achievement[],
  plans: PlanItem[]
): Achievement[] {
  const slotCounts: Record<string, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
  };
  plans.forEach((p) => {
    if (p.slot && slotCounts[p.slot] !== undefined) {
      slotCounts[p.slot] += p.completedDates.length;
    }
  });

  // ID 前缀 -> slot 映射
  const prefixToSlot: Record<string, string> = {
    'early-bird': 'morning',
    afternoon: 'afternoon',
    'night-owl': 'evening',
  };

  return achievements.map((a) => {
    if (a.category !== 'time' || a.unlockedAt) return a;
    for (const [prefix, slot] of Object.entries(prefixToSlot)) {
      if (a.id === prefix || a.id.startsWith(prefix + '-')) {
        if (slotCounts[slot] >= a.threshold) {
          return { ...a, unlockedAt: new Date().toISOString() };
        }
        break;
      }
    }
    return a;
  });
}

// 类型大师 - 按 plan.type 统计完成次数
function checkTypeMasterAchievements(
  achievements: Achievement[],
  plans: PlanItem[]
): Achievement[] {
  const counts: Record<string, number> = {
    meal: 0,
    study: 0,
    workout: 0,
    other: 0,
  };
  plans.forEach((p) => {
    if (counts[p.type] !== undefined) {
      counts[p.type] += p.completedDates.length;
    }
  });

  return achievements.map((a) => {
    if (a.category !== 'type-master' || a.unlockedAt) return a;
    // ID 格式: {type}-{threshold}
    const dashIdx = a.id.lastIndexOf('-');
    if (dashIdx > 0) {
      const type = a.id.substring(0, dashIdx);
      if (counts[type] !== undefined && counts[type] >= a.threshold) {
        return { ...a, unlockedAt: new Date().toISOString() };
      }
    }
    return a;
  });
}

// 经验值成就 - 比较累计 XP
function checkXPAchievements(
  achievements: Achievement[],
  totalXP: number
): Achievement[] {
  return achievements.map((a) => {
    if (a.category !== 'xp' || a.unlockedAt) return a;
    if (totalXP >= a.threshold) {
      return { ...a, unlockedAt: new Date().toISOString() };
    }
    return a;
  });
}

// 回归成就 - 检测完成日期中是否有 3+ 天间隔
function checkComebackAchievements(
  achievements: Achievement[],
  plans: PlanItem[]
): Achievement[] {
  const allDates = new Set<string>();
  plans.forEach((p) => p.completedDates.forEach((d) => allDates.add(d)));
  const sortedDates = Array.from(allDates).sort();

  let hasComeback = false;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseISO(sortedDates[i - 1]);
    const curr = parseISO(sortedDates[i]);
    const diff = differenceInCalendarDays(curr, prev);
    if (diff >= 3) {
      hasComeback = true;
      break;
    }
  }

  return achievements.map((a) => {
    if (a.category !== 'comeback' || a.unlockedAt) return a;
    if (a.id === 'comeback-1' && hasComeback) {
      return { ...a, unlockedAt: new Date().toISOString() };
    }
    return a;
  });
}

// 自定义成就检查 - 根据 triggerType 判断达成条件
function checkCustomAchievements(
  achievements: Achievement[],
  plans: PlanItem[],
  streakCurrent: number,
  totalXP: number,
  level: number
): Achievement[] {
  const totalCompletions = plans.reduce((sum, p) => sum + p.completedDates.length, 0);
  const todoCompleted = plans
    .filter((p) => p.category === 'todo')
    .reduce((sum, p) => sum + p.completedDates.length, 0);

  return achievements.map((a) => {
    if (a.category !== 'custom' || a.unlockedAt) return a;
    if (!a.triggerType) return a;

    let currentValue = 0;
    switch (a.triggerType) {
      case 'completions':
        currentValue = totalCompletions;
        break;
      case 'streak':
        currentValue = streakCurrent;
        break;
      case 'xp':
        currentValue = totalXP;
        break;
      case 'todo':
        currentValue = todoCompleted;
        break;
      case 'level':
        currentValue = level;
        break;
    }

    if (currentValue >= a.threshold) {
      return { ...a, unlockedAt: new Date().toISOString() };
    }
    return a;
  });
}

export function useAchievementChecker() {
  const plans = useScheduleStore((s) => s.plans);
  const streak = useScheduleStore((s) => s.streak);
  const experience = useScheduleStore((s) => s.experience);
  const setAchievements = useScheduleStore((s) => s.setAchievements);

  useEffect(() => {
    let achievements: Achievement[] = useScheduleStore.getState().achievements;
    if (achievements.length === 0) {
      achievements = ACHIEVEMENT_TEMPLATES.map((t) => ({ ...t, unlockedAt: null }));
    }
    let updated = checkStreakAchievements(achievements, streak.current);
    updated = checkCompletionAchievements(updated, plans);
    updated = checkTodoAchievements(updated, plans);
    updated = checkLevelAchievements(updated, experience.level);
    updated = checkTimeAchievements(updated, plans);
    updated = checkTypeMasterAchievements(updated, plans);
    updated = checkXPAchievements(updated, experience.totalXP);
    updated = checkComebackAchievements(updated, plans);
    updated = checkCustomAchievements(updated, plans, streak.current, experience.totalXP, experience.level);
    const changed = updated.some((a, i) => a.unlockedAt !== achievements[i]?.unlockedAt);
    if (changed) {
      setAchievements(updated);
      void setMeta('achievements', updated);
    }
  }, [plans, streak, experience, setAchievements]);
}

// 工具:根据今日完成情况,更新 streak
export function updateStreakOnCompletion(dateStr: string, currentStreak: { current: number; longest: number; lastCheckInDate: string | null }) {
  const today = dateStr;
  if (currentStreak.lastCheckInDate === today) return currentStreak;
  if (!currentStreak.lastCheckInDate) {
    return { current: 1, longest: Math.max(1, currentStreak.longest), lastCheckInDate: today };
  }
  const last = parseISO(currentStreak.lastCheckInDate);
  const cur = parseISO(today);
  const diff = differenceInCalendarDays(cur, last);
  if (diff === 1) {
    const newCurrent = currentStreak.current + 1;
    return { current: newCurrent, longest: Math.max(newCurrent, currentStreak.longest), lastCheckInDate: today };
  } else if (diff > 1) {
    return { current: 1, longest: Math.max(1, currentStreak.longest), lastCheckInDate: today };
  } else {
    // diff < 0 (回填了更早的日期),保持当前 streak 不变
    return currentStreak;
  }
}
