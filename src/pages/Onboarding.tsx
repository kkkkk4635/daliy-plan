import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Github, Cloud, Repeat, Bell, Trophy, Check } from 'lucide-react';
import { BrutalButton, BrutalCard } from '../components/UI';
import { setCredentials, isConfigured } from '../utils/sync';
import clsx from 'clsx';

const STEPS = [
  {
    icon: BookOpen,
    title: '欢迎来到课表',
    body: '一款零后端的每日计划应用,部署在 Netlify,通过 GitHub Gist 实现多端同步。',
  },
  {
    icon: Repeat,
    title: '记录每日的吃学练',
    body: '在课表上安排饮食、学习、锻炼等计划,支持单次或每周重复。',
  },
  {
    icon: Bell,
    title: '定时提醒 + 复选勾选',
    body: '为计划开启通知提醒,完成后勾选复选框,打卡记录自动保存。',
  },
  {
    icon: Trophy,
    title: '成就激励',
    body: '连续打卡 7 天、单日 100% 完成...解锁各种徽章,见证你的成长。',
  },
  {
    icon: Cloud,
    title: '绑定 Gist 实现多端同步',
    body: '在下一个页面粘贴你的 Gist ID 与 PAT,即可在所有设备实时同步。',
  },
];

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [gistId, setGistId] = useState('');
  const [pat, setPat] = useState('');

  const isLast = step === STEPS.length - 1;
  const isBindStep = step === STEPS.length;

  const next = () => {
    if (isBindStep) {
      if (!gistId.trim() || !pat.trim()) {
        // 允许跳过
        navigate('/');
        return;
      }
      setCredentials(gistId, pat);
      navigate('/');
      return;
    }
    setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const skip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 lg:p-8 paper-texture">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-12 h-12 rounded-md bg-[var(--terracotta)] border-2 border-[var(--ink)] flex items-center justify-center shadow-brutal">
            <BookOpen size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-3xl font-bold">课表</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
              daily · planner
            </div>
          </div>
        </div>

        {step < STEPS.length && (
          <BrutalCard className="p-6 lg:p-8 animate-pop-in" key={step}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-md bg-[var(--terracotta)] border-2 border-[var(--ink)] flex items-center justify-center text-white shadow-brutal-sm">
                {(() => {
                  const Icon = STEPS[step].icon;
                  return <Icon size={24} strokeWidth={2.5} />;
                })()}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
                步骤 {step + 1} / {STEPS.length}
              </div>
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold mb-3">
              {STEPS[step].title}
            </h1>
            <p className="text-base text-[var(--ink-soft)] leading-relaxed">
              {STEPS[step].body}
            </p>

            {/* 步骤指示器 */}
            <div className="flex gap-1.5 mt-6">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={clsx(
                    'h-1.5 rounded-full transition-all',
                    i === step ? 'w-8 bg-[var(--terracotta)]' : 'w-1.5 bg-[var(--ink)]/20'
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between mt-6">
              {step > 0 ? (
                <BrutalButton variant="ghost" onClick={() => setStep(step - 1)}>
                  上一步
                </BrutalButton>
              ) : (
                <BrutalButton variant="ghost" onClick={skip}>
                  跳过引导
                </BrutalButton>
              )}
              <BrutalButton variant="primary" onClick={next}>
                下一步
                <ArrowRight size={16} />
              </BrutalButton>
            </div>
          </BrutalCard>
        )}

        {isBindStep && (
          <BrutalCard className="p-6 lg:p-8 animate-pop-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-md bg-[var(--ink)] border-2 border-[var(--ink)] flex items-center justify-center text-[var(--bg)] shadow-brutal-sm">
                <Github size={24} strokeWidth={2.5} />
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
                配置同步
              </div>
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold mb-2">
              绑定 GitHub Gist
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mb-5 leading-relaxed">
              首次使用需要你创建一个 Gist 用于存储数据。整个过程不超过 1 分钟。
            </p>

            <div className="bg-[var(--bg-soft)] border-2 border-dashed border-[var(--ink)]/30 rounded-md p-4 mb-5">
              <div className="text-xs font-mono uppercase tracking-widest font-bold mb-2">
                操作步骤
              </div>
              <ol className="text-sm space-y-1.5 list-decimal list-inside text-[var(--ink-soft)]">
                <li>访问 <a href="https://gist.github.com/" target="_blank" rel="noreferrer" className="text-[var(--terracotta)] underline">gist.github.com</a></li>
                <li>文件名写 <code className="bg-[var(--bg)] px-1 rounded">schedule.json</code>,内容留空</li>
                <li>创建后,URL 最后那段就是 <strong>Gist ID</strong></li>
                <li>前往 <a href="https://github.com/settings/tokens/new?scopes=gist" target="_blank" rel="noreferrer" className="text-[var(--terracotta)] underline">GitHub 设置</a> 创建一个仅勾选 <code className="bg-[var(--bg)] px-1 rounded">gist</code> 权限的 PAT</li>
                <li>把 Gist ID 和 PAT 填到下方即可</li>
              </ol>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                  Gist ID
                </label>
                <input
                  value={gistId}
                  onChange={(e) => setGistId(e.target.value)}
                  placeholder="abc1234567890..."
                  className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono text-sm focus:outline-none focus:shadow-brutal-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                  Personal Access Token
                </label>
                <input
                  type="password"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono text-sm focus:outline-none focus:shadow-brutal-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 gap-2">
              <BrutalButton variant="ghost" onClick={skip}>
                稍后设置
              </BrutalButton>
              <BrutalButton
                variant="primary"
                onClick={() => {
                  if (gistId && pat) {
                    setCredentials(gistId, pat);
                  }
                  navigate('/');
                }}
              >
                {gistId && pat ? <><Check size={16} />完成设置</> : <>进入应用<ArrowRight size={16} /></>}
              </BrutalButton>
            </div>
          </BrutalCard>
        )}
      </div>
    </div>
  );
}
