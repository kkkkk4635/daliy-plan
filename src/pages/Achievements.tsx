import { useState } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import {
  Flame,
  Trophy,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  Stars,
  Target,
  Crown,
  Award,
  Lock,
  Gem,
  Diamond,
  Star,
  StarHalf,
  ClipboardCheck,
  ListChecks,
  AlertTriangle,
  Sunrise,
  Sun,
  Moon,
  Utensils,
  BookOpen,
  Dumbbell,
  ClipboardList,
  Zap,
  RefreshCw,
  Plus,
  X,
  Trash2,
  Wrench,
} from 'lucide-react';
import { cnDate } from '../utils/date';
import { Tag, BrutalCard, BrutalButton, Drawer } from '../components/UI';
import clsx from 'clsx';
import { getXPForNextLevel, getLevelTitle, AchievementTriggerType } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  Flame,
  Trophy,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  Stars,
  Target,
  Crown,
  Award,
  Gem,
  Diamond,
  Star,
  StarHalf,
  ClipboardCheck,
  ListChecks,
  AlertTriangle,
  Sunrise,
  Sun,
  Moon,
  Utensils,
  BookOpen,
  Dumbbell,
  ClipboardList,
  Zap,
  RefreshCw,
  Wrench,
};

const CUSTOM_ICON_OPTIONS = [
  { value: 'Trophy', label: '奖杯', icon: Trophy },
  { value: 'Award', label: '徽章', icon: Award },
  { value: 'Star', label: '星星', icon: Star },
  { value: 'Crown', label: '皇冠', icon: Crown },
  { value: 'Gem', label: '宝石', icon: Gem },
  { value: 'Diamond', label: '钻石', icon: Diamond },
  { value: 'Target', label: '目标', icon: Target },
  { value: 'Flame', label: '火焰', icon: Flame },
  { value: 'Zap', label: '闪电', icon: Zap },
  { value: 'Sparkles', label: '闪光', icon: Sparkles },
  { value: 'CheckCircle', label: '完成', icon: CheckCircle },
  { value: 'Wrench', label: '扳手', icon: Wrench },
];

const TRIGGER_TYPE_OPTIONS: { value: AchievementTriggerType; label: string; description: string }[] = [
  { value: 'completions', label: '完成次数', description: '累计完成任务的次数' },
  { value: 'streak', label: '连续打卡', description: '当前连续打卡天数' },
  { value: 'xp', label: '经验值', description: '累计获得的经验值' },
  { value: 'todo', label: '待办完成', description: '累计完成待办的数量' },
  { value: 'level', label: '等级', description: '当前达到的等级' },
];

const CATEGORY_LABEL: Record<string, string> = {
  streak: '连续打卡',
  completion: '单日完成',
  variety: '类型丰富',
  consistency: '累计完成',
  level: '等级提升',
  todo: '待办达人',
  'todo-high': '高优待办',
  time: '时段达人',
  'type-master': '类型大师',
  xp: '经验成就',
  comeback: '回归徽章',
  custom: '自定义成就',
};

const CATEGORY_COLOR: Record<string, string> = {
  streak: 'text-[var(--terracotta)]',
  completion: 'text-[var(--teal)]',
  variety: 'text-[var(--sand)]',
  consistency: 'text-[var(--ink)]',
  level: 'text-purple-600',
  todo: 'text-blue-600',
  'todo-high': 'text-red-600',
  time: 'text-amber-500',
  'type-master': 'text-emerald-500',
  xp: 'text-yellow-500',
  comeback: 'text-cyan-600',
  custom: 'text-pink-600',
};

// Tag 组件只支持: ink | terracotta | teal | meal-color | study-color | workout-color | other-color
const CATEGORY_TAG_COLOR: Record<string, 'ink' | 'terracotta' | 'teal' | 'meal-color' | 'study-color' | 'workout-color' | 'other-color'> = {
  streak: 'terracotta',
  completion: 'teal',
  variety: 'terracotta',
  consistency: 'ink',
  level: 'ink',
  todo: 'ink',
  'todo-high': 'terracotta',
  time: 'teal',
  'type-master': 'ink',
  xp: 'ink',
  comeback: 'teal',
  custom: 'terracotta',
};

interface CustomAchievementForm {
  title: string;
  description: string;
  icon: string;
  threshold: string;
  triggerType: AchievementTriggerType;
}

export function Achievements() {
  const achievements = useScheduleStore((s) => s.achievements);
  const streak = useScheduleStore((s) => s.streak);
  const experience = useScheduleStore((s) => s.experience);
  const plans = useScheduleStore((s) => s.plans);
  const addCustomAchievement = useScheduleStore((s) => s.addCustomAchievement);
  const removeCustomAchievement = useScheduleStore((s) => s.removeCustomAchievement);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<CustomAchievementForm>({
    title: '',
    description: '',
    icon: 'Trophy',
    threshold: '',
    triggerType: 'completions',
  });

  const totalCompleted = plans.reduce((sum, p) => sum + p.completedDates.length, 0);
  const unlocked = achievements.filter((a) => a.unlockedAt).length;
  const total = achievements.length;

  const xpNeeded = getXPForNextLevel(experience.level);
  const xpProgress = Math.round((experience.currentXP / xpNeeded) * 100);
  const levelTitle = getLevelTitle(experience.level);

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim() || !form.threshold) return;
    addCustomAchievement(form.title, form.description, form.icon, parseInt(form.threshold), form.triggerType);
    setForm({
      title: '',
      description: '',
      icon: 'Trophy',
      threshold: '',
      triggerType: 'completions',
    });
    setDrawerOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除这个自定义成就？')) {
      removeCustomAchievement(id);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">achievements</div>
          <h1 className="font-display text-3xl font-bold">成就墙</h1>
          <p className="text-sm text-[var(--ink-soft)] mt-1">
            每一个习惯,都是一枚徽章。已解锁 {unlocked} / {total}
          </p>
        </div>
        <BrutalButton onClick={() => setDrawerOpen(true)}>
          <Plus size={18} className="mr-2" />
          创建自定义成就
        </BrutalButton>
      </div>

      {/* 等级和经验值卡片 */}
      <div className="bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md p-6 shadow-brutal-sm mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* 等级徽章 */}
          <div className="relative">
            <div className="w-24 h-24 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-4 border-[var(--ink)] shadow-brutal-sm">
              <div className="text-center">
                <div className="text-white font-display text-4xl font-bold">{experience.level}</div>
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[var(--bg)] border-2 border-[var(--ink)] rounded-md px-3 py-1 text-xs font-mono">
              {levelTitle}
            </div>
          </div>

          {/* 经验值条 */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">经验值</span>
              <span className="text-sm font-mono text-purple-600">
                {experience.currentXP} / {xpNeeded}
              </span>
            </div>
            <div className="h-4 bg-[var(--bg-soft)] border-2 border-[var(--ink)] rounded-md overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs font-mono text-[var(--ink-soft)]">
              <span>升级还需 {xpNeeded - experience.currentXP} XP</span>
              <span>累计获得 {experience.totalXP} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="当前连续" value={streak.current} unit="天" accent="terracotta" icon={<Flame size={20} />} />
        <StatCard label="最长连续" value={streak.longest} unit="天" accent="teal" icon={<Trophy size={20} />} />
        <StatCard label="累计完成" value={totalCompleted} unit="次" accent="sand" icon={<Target size={20} />} />
        <StatCard label="徽章数" value={unlocked} unit={`/ ${total}`} accent="ink" icon={<Award size={20} />} />
      </div>

      {/* 分类成就 */}
      {(['streak', 'completion', 'variety', 'consistency', 'level', 'todo', 'todo-high', 'time', 'type-master', 'xp', 'comeback', 'custom'] as const).map((cat) => {
        const items = achievements.filter((a) => a.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-display text-xl font-bold">{CATEGORY_LABEL[cat]}</h2>
              <Tag color={CATEGORY_TAG_COLOR[cat] || 'ink'}>
                {items.filter((i) => i.unlockedAt).length} / {items.length}
              </Tag>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((a) => {
                const Icon = ICON_MAP[a.icon] || Trophy;
                const isUnlocked = !!a.unlockedAt;
                return (
                  <BrutalCard
                    key={a.id}
                    className={clsx(
                      'p-4 relative',
                      isUnlocked ? '' : 'opacity-50 grayscale'
                    )}
                  >
                    {a.isCustom && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="absolute top-2 right-2 p-1 text-[var(--ink-soft)] hover:text-[var(--terracotta)] transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="flex items-start gap-3">
                      <div
                        className={clsx(
                          'w-12 h-12 flex items-center justify-center rounded-md border-2 border-[var(--ink)] flex-shrink-0',
                          isUnlocked ? CATEGORY_COLOR[a.category].replace('text-', 'bg-') + '/20' : 'bg-[var(--bg-soft)]'
                        )}
                      >
                        {isUnlocked ? (
                          <Icon size={24} className={CATEGORY_COLOR[a.category]} strokeWidth={2.5} />
                        ) : (
                          <Lock size={20} className="text-[var(--ink-soft)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-base leading-tight">
                          {a.title}
                        </div>
                        <div className="text-xs text-[var(--ink-soft)] mt-0.5 leading-snug">
                          {a.description}
                        </div>
                        {isUnlocked ? (
                          <div className="text-[10px] font-mono text-[var(--terracotta)] mt-1.5">
                            ✓ 解锁于 {cnDate(a.unlockedAt!, 'yyyy-M-d')}
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-[var(--ink-soft)] mt-1.5">
                            🔒 尚未解锁
                          </div>
                        )}
                      </div>
                    </div>
                  </BrutalCard>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 经验值获取说明 */}
      <div className="bg-[var(--bg-soft)] border-2 border-[var(--ink)] rounded-md p-4 mt-8">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-3">xp rewards</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="font-semibold text-sm mb-1">📅 日常任务</div>
            <div className="text-xs text-[var(--ink-soft)]">基础奖励: 10 XP</div>
          </div>
          <div>
            <div className="font-semibold text-sm mb-1">✅ 待办任务</div>
            <div className="text-xs text-[var(--ink-soft)]">
              低优先级: 15 XP<br/>
              中优先级: 25 XP<br/>
              高优先级: 40 XP
            </div>
          </div>
          <div>
            <div className="font-semibold text-sm mb-1">📈 等级成长</div>
            <div className="text-xs text-[var(--ink-soft)]">
              升级所需经验: 递增1.5倍<br/>
              当前等级标题: {levelTitle}
            </div>
          </div>
        </div>
      </div>

      {/* 创建自定义成就抽屉 */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="创建自定义成就">
        <div className="space-y-4">
          {/* 成就名称 */}
          <div>
            <label className="block text-sm font-semibold mb-1">成就名称</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="输入成就名称"
              className="w-full px-3 py-2 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)]"
            />
          </div>

          {/* 成就描述 */}
          <div>
            <label className="block text-sm font-semibold mb-1">成就描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="描述达成条件"
              rows={2}
              className="w-full px-3 py-2 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] resize-none"
            />
          </div>

          {/* 触发类型 */}
          <div>
            <label className="block text-sm font-semibold mb-2">触发类型</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TRIGGER_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, triggerType: opt.value })}
                  className={clsx(
                    'p-3 border-2 rounded-md text-left transition-all',
                    form.triggerType === opt.value
                      ? 'border-[var(--terracotta)] bg-[var(--terracotta)]/10'
                      : 'border-[var(--ink)] bg-[var(--bg)] hover:border-[var(--ink-soft)]'
                  )}
                >
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 目标数值 */}
          <div>
            <label className="block text-sm font-semibold mb-1">目标数值</label>
            <input
              type="number"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })}
              placeholder="输入目标数值"
              min="1"
              className="w-full px-3 py-2 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)]"
            />
          </div>

          {/* 图标选择 */}
          <div>
            <label className="block text-sm font-semibold mb-2">选择图标</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {CUSTOM_ICON_OPTIONS.map((opt) => {
                const IconComp = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, icon: opt.value })}
                    className={clsx(
                      'p-2 border-2 rounded-md flex flex-col items-center gap-1 transition-all',
                      form.icon === opt.value
                        ? 'border-[var(--terracotta)] bg-[var(--terracotta)]/10'
                        : 'border-[var(--ink)] bg-[var(--bg)] hover:border-[var(--ink-soft)]'
                    )}
                    title={opt.label}
                  >
                    <IconComp size={20} />
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <BrutalButton variant="secondary" onClick={() => setDrawerOpen(false)} className="flex-1">
              <X size={16} className="mr-2" />
              取消
            </BrutalButton>
            <BrutalButton onClick={handleSubmit} className="flex-1" disabled={!form.title.trim() || !form.description.trim() || !form.threshold}>
              确认创建
            </BrutalButton>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function StatCard({ label, value, unit, accent, icon }: {
  label: string;
  value: number;
  unit: string;
  accent: 'terracotta' | 'teal' | 'sand' | 'ink';
  icon: React.ReactNode;
}) {
  const colorClass = accent === 'terracotta' ? 'text-[var(--terracotta)]' :
    accent === 'teal' ? 'text-[var(--teal)]' :
    accent === 'sand' ? 'text-[var(--sand)]' : 'text-[var(--ink)]';
  return (
    <BrutalCard className="p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
          {label}
        </div>
        <div className={colorClass}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <div className={clsx('font-display text-3xl font-bold tabular-nums', colorClass)}>
          {value}
        </div>
        <div className="text-xs text-[var(--ink-soft)] font-mono">{unit}</div>
      </div>
    </BrutalCard>
  );
}
