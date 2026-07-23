import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Target, CheckCircle, Calendar, Flame, Trophy, Zap, Minus, Clock, Rocket, Mountain } from 'lucide-react';
import clsx from 'clsx';
import { useScheduleStore } from '../store/useScheduleStore';
import { ymd, parseISO, cnDate } from '../utils/date';
import { BrutalButton } from '../components/UI';

// 目标类型: 短期 / 中期 / 长期
type GoalType = 'short' | 'mid' | 'long';
// 进度来源: auto = 自动统计(days/completions/level), manual = 手动填写数值
type ProgressSource = 'auto' | 'manual';

interface Goal {
  id: string;
  title: string;
  goalType: GoalType;           // 短期/中期/长期
  progressSource: ProgressSource; // auto: 自动统计 / manual: 手动填写
  unit: string;                 // 单位文本: 斤、天、次、级、km...
  target: number;               // 目标数值
  current: number;              // 当前数值 (manual 时手动维护, auto 时自动计算)
  autoType?: 'days' | 'completions' | 'level'; // progressSource=auto 时的统计类型
  deadline: string;             // YYYY-MM-DD
  createdAt: string;
  note?: string;
}

const GOAL_TYPE_META: Record<GoalType, { label: string; icon: typeof Clock; color: string; bgColor: string; desc: string }> = {
  short: { label: '短期', icon: Rocket,   color: 'text-[var(--terracotta)]', bgColor: 'bg-[var(--terracotta)]/10', desc: '1个月内' },
  mid:   { label: '中期', icon: Clock,    color: 'text-[var(--teal)]',       bgColor: 'bg-[var(--teal)]/10',       desc: '1-3个月' },
  long:  { label: '长期', icon: Mountain, color: 'text-purple-600',           bgColor: 'bg-purple-600/10',          desc: '3个月以上' },
};

const COMMON_UNITS = ['斤', 'kg', '天', '次', '级', 'km', '页', '小时', '分钟', '个'];
const AUTO_TYPES: { key: 'days' | 'completions' | 'level'; label: string; desc: string; unit: string }[] = [
  { key: 'days',        label: '天数', desc: '自动统计打卡天数',     unit: '天' },
  { key: 'completions', label: '次数', desc: '自动统计任务完成次数', unit: '次' },
  { key: 'level',       label: '等级', desc: '自动读取当前等级',     unit: '级' },
];

const PRESET_GOALS: Omit<Goal, 'id' | 'createdAt'>[] = [
  { title: '连续7天打卡',     goalType: 'short', progressSource: 'auto',  unit: '天', target: 7,   current: 0, autoType: 'days',        deadline: ymd(new Date(Date.now() + 7  * 24 * 3600 * 1000)) },
  { title: '完成100次任务',    goalType: 'mid',   progressSource: 'auto',  unit: '次', target: 100, current: 0, autoType: 'completions', deadline: ymd(new Date(Date.now() + 90 * 24 * 3600 * 1000)) },
  { title: '达到5级',         goalType: 'mid',   progressSource: 'auto',  unit: '级', target: 5,   current: 0, autoType: 'level',       deadline: ymd(new Date(Date.now() + 60 * 24 * 3600 * 1000)) },
  { title: '减肥10斤',        goalType: 'mid',   progressSource: 'manual', unit: '斤', target: 10,  current: 0,                          deadline: ymd(new Date(Date.now() + 90 * 24 * 3600 * 1000)) },
  { title: '阅读30本书',      goalType: 'long',  progressSource: 'manual', unit: '本', target: 30,  current: 0,                          deadline: ymd(new Date(Date.now() + 365 * 24 * 3600 * 1000)) },
  { title: '跑步累计200km',   goalType: 'long',  progressSource: 'manual', unit: 'km', target: 200, current: 0,                          deadline: ymd(new Date(Date.now() + 365 * 24 * 3600 * 1000)) },
];

interface GoalFormState {
  title: string;
  goalType: GoalType;
  progressSource: ProgressSource;
  unit: string;
  target: number;
  current: number;
  autoType: 'days' | 'completions' | 'level';
  deadline: string;
  note: string;
}

const DEFAULT_FORM: GoalFormState = {
  title: '',
  goalType: 'short',
  progressSource: 'manual',
  unit: '斤',
  target: 10,
  current: 0,
  autoType: 'days',
  deadline: ymd(new Date(Date.now() + 30 * 24 * 3600 * 1000)),
  note: '',
};

export function Goals() {
  const plans = useScheduleStore((s) => s.plans);
  const streak = useScheduleStore((s) => s.streak);
  const experience = useScheduleStore((s) => s.experience);

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<GoalType | 'all'>('all');
  const [form, setForm] = useState<GoalFormState>(DEFAULT_FORM);

  useEffect(() => {
    localStorage.setItem('goals', JSON.stringify(goals));
  }, [goals]);

  // 自动统计数据
  const autoStats = useMemo(() => {
    const completedDates = new Set<string>();
    plans.forEach((p) => p.completedDates.forEach((d) => completedDates.add(d)));
    const totalCompletions = plans.reduce((sum, p) => sum + p.completedDates.length, 0);
    return {
      days: completedDates.size,
      completions: totalCompletions,
      level: experience.level,
    };
  }, [plans, experience.level]);

  // 计算目标当前进度
  const getProgress = (goal: Goal): number => {
    if (goal.progressSource === 'auto') {
      const autoType = goal.autoType || 'days';
      return Math.min(autoStats[autoType], goal.target);
    }
    return Math.min(goal.current, goal.target);
  };

  const handleSaveGoal = () => {
    if (!form.title.trim()) return;

    const goal: Goal = {
      id: editingGoal?.id || Date.now().toString(),
      title: form.title.trim(),
      goalType: form.goalType,
      progressSource: form.progressSource,
      unit: form.unit,
      target: Math.max(1, form.target),
      current: Math.max(0, form.current),
      autoType: form.progressSource === 'auto' ? form.autoType : undefined,
      deadline: form.deadline,
      createdAt: editingGoal?.createdAt || new Date().toISOString(),
      note: form.note.trim() || undefined,
    };

    if (editingGoal) {
      setGoals(goals.map((g) => (g.id === goal.id ? goal : g)));
    } else {
      setGoals([...goals, goal]);
    }
    setDrawerOpen(false);
    setEditingGoal(null);
    setForm(DEFAULT_FORM);
  };

  const handleDeleteGoal = (id: string) => {
    if (!confirm('确定删除此目标？')) return;
    setGoals(goals.filter((g) => g.id !== id));
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      goalType: goal.goalType,
      progressSource: goal.progressSource,
      unit: goal.unit,
      target: goal.target,
      current: goal.current,
      autoType: goal.autoType || 'days',
      deadline: goal.deadline,
      note: goal.note || '',
    });
    setDrawerOpen(true);
  };

  // 手动更新进度
  const handleAdjustCurrent = (id: string, delta: number) => {
    setGoals(goals.map((g) => {
      if (g.id !== id) return g;
      const next = Math.max(0, g.current + delta);
      return { ...g, current: next };
    }));
  };

  const handlePresetClick = (preset: Omit<Goal, 'id' | 'createdAt'>) => {
    setEditingGoal(null);
    setForm({
      title: preset.title,
      goalType: preset.goalType,
      progressSource: preset.progressSource,
      unit: preset.unit,
      target: preset.target,
      current: preset.current,
      autoType: preset.autoType || 'days',
      deadline: preset.deadline,
      note: '',
    });
    setDrawerOpen(true);
  };

  const filteredGoals = useMemo(() => {
    const withProgress = goals.map((g) => ({ ...g, _progress: getProgress(g) }));
    const list = filter === 'all' ? withProgress : withProgress.filter((g) => g.goalType === filter);
    return list.sort((a, b) => {
      const aDone = a._progress >= a.target;
      const bDone = b._progress >= b.target;
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [goals, filter, autoStats]);

  const completedGoals = filteredGoals.filter((g) => g._progress >= g.target);
  const activeGoals = filteredGoals.filter((g) => g._progress < g.target);

  const counts = useMemo(() => ({
    all: goals.length,
    short: goals.filter((g) => g.goalType === 'short').length,
    mid: goals.filter((g) => g.goalType === 'mid').length,
    long: goals.filter((g) => g.goalType === 'long').length,
  }), [goals]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 lg:px-8 py-4 border-b-2 border-[var(--ink)] flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[var(--bg-soft)]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">goals</div>
          <div className="font-display text-xl font-bold">我的目标</div>
        </div>
        <button
          onClick={() => { setEditingGoal(null); setForm(DEFAULT_FORM); setDrawerOpen(true); }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border-2 border-[var(--ink)] rounded-md bg-[var(--terracotta)] text-white shadow-brutal-sm hover:shadow-brutal-hover transition-all"
        >
          <Plus size={14} />
          新建目标
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 统计概览 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-[var(--terracotta)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">活动天数</span>
              </div>
              <div className="font-display text-2xl font-bold">{autoStats.days}</div>
            </div>
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} className="text-[var(--teal)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">完成次数</span>
              </div>
              <div className="font-display text-2xl font-bold text-[var(--teal)]">{autoStats.completions}</div>
            </div>
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-purple-600" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">当前等级</span>
              </div>
              <div className="font-display text-2xl font-bold text-purple-600">{autoStats.level}</div>
            </div>
            <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-3 shadow-brutal-sm">
              <div className="flex items-center gap-2 mb-1">
                <Flame size={14} className="text-[var(--terracotta)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">当前连续</span>
              </div>
              <div className="font-display text-2xl font-bold">{streak.current}天</div>
            </div>
          </div>

          {/* 筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: 'all' as const,   label: `全部(${counts.all})` },
              { key: 'short' as const, label: `短期(${counts.short})` },
              { key: 'mid' as const,   label: `中期(${counts.mid})` },
              { key: 'long' as const,  label: `长期(${counts.long})` },
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
          </div>

          {/* 进行中目标 */}
          {activeGoals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-display text-xl font-bold">进行中</h2>
                <span className="text-[10px] font-mono text-[var(--ink-soft)]">({activeGoals.length})</span>
              </div>
              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const progress = goal.target > 0 ? Math.round((goal._progress / goal.target) * 100) : 0;
                  const deadline = parseISO(goal.deadline);
                  const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (24 * 3600 * 1000));
                  const typeMeta = GOAL_TYPE_META[goal.goalType];
                  const TypeIcon = typeMeta.icon;

                  return (
                    <div
                      key={goal.id}
                      className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-4 shadow-brutal-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border', typeMeta.bgColor, typeMeta.color, 'border-current')}>
                              <TypeIcon size={10} />
                              {typeMeta.label}
                            </span>
                            <span className="font-display font-bold text-base">{goal.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[var(--ink-soft)]">
                            <span>目标: {goal.target}{goal.unit}</span>
                            <span>截止: {cnDate(goal.deadline)}</span>
                            {daysLeft >= 0 ? (
                              <span className="font-mono">剩余 {daysLeft} 天</span>
                            ) : (
                              <span className="font-mono text-red-600">已逾期 {-daysLeft} 天</span>
                            )}
                            {goal.progressSource === 'auto' && (
                              <span className="text-[10px] font-mono text-[var(--teal)]">自动统计</span>
                            )}
                          </div>
                          {goal.note && (
                            <div className="text-xs text-[var(--ink-soft)] mt-1 italic">{goal.note}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <button
                            onClick={() => handleEditGoal(goal)}
                            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)]"
                            aria-label="编辑"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="w-8 h-8 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-red-50 hover:text-red-600"
                            aria-label="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-[var(--ink-soft)]">进度</span>
                            <span className="text-xs font-mono">
                              {goal._progress} / {goal.target} {goal.unit}
                            </span>
                          </div>
                          <div className="h-3 bg-[var(--bg-soft)] border border-[var(--ink)] rounded-md overflow-hidden">
                            <div
                              className={clsx(
                                'h-full transition-all',
                                goal.goalType === 'short' && 'bg-gradient-to-r from-[var(--terracotta)] to-[var(--sand)]',
                                goal.goalType === 'mid' && 'bg-gradient-to-r from-[var(--teal)] to-[var(--sand)]',
                                goal.goalType === 'long' && 'bg-gradient-to-r from-purple-500 to-pink-500',
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <div className={clsx('font-display text-xl font-bold', typeMeta.color)}>{progress}%</div>
                      </div>
                      {/* 手动目标：快捷增减进度 */}
                      {goal.progressSource === 'manual' && goal._progress < goal.target && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--ink)]/10">
                          <span className="text-[10px] font-mono text-[var(--ink-soft)]">更新进度:</span>
                          <button
                            onClick={() => handleAdjustCurrent(goal.id, -1)}
                            className="w-7 h-7 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)]"
                          >
                            <Minus size={12} />
                          </button>
                          <button
                            onClick={() => handleAdjustCurrent(goal.id, 1)}
                            className="w-7 h-7 flex items-center justify-center border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)]"
                          >
                            <Plus size={12} />
                          </button>
                          <span className="text-xs font-mono text-[var(--ink-soft)] ml-1">
                            当前: {goal.current}{goal.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 已完成目标 */}
          {completedGoals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-display text-xl font-bold">已达成</h2>
                <span className="text-[10px] font-mono text-[var(--ink-soft)]">({completedGoals.length})</span>
              </div>
              <div className="space-y-3">
                {completedGoals.map((goal) => {
                  const typeMeta = GOAL_TYPE_META[goal.goalType];
                  const TypeIcon = typeMeta.icon;
                  return (
                    <div
                      key={goal.id}
                      className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-4 shadow-brutal-sm opacity-70"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle size={24} className="text-[var(--teal)]" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold', typeMeta.bgColor, typeMeta.color)}>
                              <TypeIcon size={10} />
                              {typeMeta.label}
                            </span>
                            <span className="font-display font-bold text-base line-through">{goal.title}</span>
                          </div>
                          <div className="text-xs text-[var(--ink-soft)] mt-0.5">
                            目标: {goal.target}{goal.unit} · 已达成
                          </div>
                        </div>
                        <Trophy size={20} className="text-amber-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {goals.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-[var(--ink)] rounded-md flex items-center justify-center text-[var(--ink-soft)]">
                <Target size={32} />
              </div>
              <div className="font-display text-xl font-bold mb-1">暂无目标</div>
              <div className="text-sm text-[var(--ink-soft)]">点击右上角「新建目标」设定你的第一个目标</div>
            </div>
          )}

          {/* 预设目标 */}
          <div className="bg-[var(--bg-soft)] border-2 border-[var(--ink)] rounded-md p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-3">quick goals · 预设目标</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PRESET_GOALS.map((preset) => {
                const typeMeta = GOAL_TYPE_META[preset.goalType];
                const TypeIcon = typeMeta.icon;
                return (
                  <button
                    key={preset.title}
                    onClick={() => handlePresetClick(preset)}
                    className="px-3 py-2 text-xs font-semibold border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] hover:bg-[var(--bg-soft)] text-left"
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <TypeIcon size={12} className={typeMeta.color} />
                      <span className="font-bold">{preset.title}</span>
                    </div>
                    <div className="text-[10px] text-[var(--ink-soft)]">
                      {typeMeta.label}期 · {preset.target}{preset.unit}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 新建/编辑目标抽屉 */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[var(--ink)]/30 backdrop-blur-sm"
            onClick={() => { setDrawerOpen(false); setEditingGoal(null); }}
          />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] bg-[var(--bg)] border-l-2 border-[var(--ink)] shadow-brutal-lg overflow-y-auto">
            <div className="sticky top-0 bg-[var(--bg)] border-b-2 border-[var(--ink)] px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
                  {editingGoal ? 'edit goal' : 'new goal'}
                </div>
                <h2 className="font-display text-xl font-bold">{editingGoal ? '编辑目标' : '新建目标'}</h2>
              </div>
              <button
                onClick={() => { setDrawerOpen(false); setEditingGoal(null); }}
                className="w-9 h-9 flex items-center justify-center border-2 border-[var(--ink)] rounded-md hover:bg-[var(--bg-soft)]"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* 目标名称 */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                  目标名称
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例如：减肥10斤 / 读完30本书"
                  className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-medium focus:outline-none focus:shadow-brutal-sm"
                  autoFocus
                />
              </div>

              {/* 目标类型 */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                  目标类型
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['short', 'mid', 'long'] as GoalType[]).map((t) => {
                    const meta = GOAL_TYPE_META[t];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={t}
                        onClick={() => setForm({ ...form, goalType: t })}
                        className={clsx(
                          'flex flex-col items-center gap-1 py-2.5 border-2 border-[var(--ink)] rounded-md transition-all',
                          form.goalType === t
                            ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm'
                            : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                        )}
                      >
                        <Icon size={16} />
                        <span className="text-sm font-semibold">{meta.label}</span>
                        <span className="text-[10px] opacity-70">{meta.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 计量方式 */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                  计量方式
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AUTO_TYPES.map((a) => {
                    const isActive = form.progressSource === 'auto' && form.autoType === a.key;
                    return (
                      <button
                        key={a.key}
                        onClick={() => setForm({ ...form, progressSource: 'auto', autoType: a.key, unit: a.unit })}
                        className={clsx(
                          'flex flex-col items-center gap-1 py-2.5 border-2 border-[var(--ink)] rounded-md transition-all',
                          isActive
                            ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm'
                            : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                        )}
                      >
                        <span className="text-sm font-semibold">{a.label}</span>
                        <span className="text-[10px] opacity-70 text-center leading-tight">{a.desc}</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setForm({ ...form, progressSource: 'manual' })}
                    className={clsx(
                      'flex flex-col items-center gap-1 py-2.5 border-2 border-[var(--ink)] rounded-md transition-all',
                      form.progressSource === 'manual'
                        ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm'
                        : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                    )}
                  >
                    <span className="text-sm font-semibold">自定义</span>
                    <span className="text-[10px] opacity-70 text-center leading-tight">手动填写进度</span>
                  </button>
                </div>
              </div>

              {/* 目标数值 + 单位 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                    目标数值
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono focus:outline-none focus:shadow-brutal-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                    单位
                  </label>
                  {form.progressSource === 'auto' ? (
                    <input
                      value={form.unit}
                      disabled
                      className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg-soft)] font-mono opacity-60"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_UNITS.map((u) => (
                        <button
                          key={u}
                          onClick={() => setForm({ ...form, unit: u })}
                          className={clsx(
                            'px-2.5 py-1.5 text-xs font-mono font-semibold border-2 border-[var(--ink)] rounded-md transition-all',
                            form.unit === u
                              ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm'
                              : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 当前数值（仅手动） */}
              {form.progressSource === 'manual' && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                    当前数值（起始值）
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.current}
                    onChange={(e) => setForm({ ...form, current: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono focus:outline-none focus:shadow-brutal-sm"
                  />
                </div>
              )}

              {/* 截止日期 */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                  截止日期
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono focus:outline-none focus:shadow-brutal-sm"
                />
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                  备注（可选）
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  placeholder="例如：通过控制饮食+运动实现"
                  className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] text-sm focus:outline-none focus:shadow-brutal-sm resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--bg)] border-t-2 border-[var(--ink)] px-6 py-4 flex items-center gap-2">
              <BrutalButton variant="secondary" onClick={() => { setDrawerOpen(false); setEditingGoal(null); }}>
                取消
              </BrutalButton>
              <BrutalButton variant="primary" onClick={handleSaveGoal}>
                {editingGoal ? '保存修改' : '创建目标'}
              </BrutalButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
