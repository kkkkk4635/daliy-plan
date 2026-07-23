import { useEffect, useState } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import {
  Github,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Bell,
  Sun,
  Moon,
  Coffee,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';
import { BrutalButton, BrutalCard, Tag } from '../components/UI';
import { isConfigured, setCredentials, testConnection, pullFromGist, pushToGist, getCredentials, clearCredentials, getLastSyncedAt } from '../utils/sync';
import { applyPayload, initMeta, loadPayload } from '../utils/idb';
import { DEFAULT_EXPERIENCE } from '../types';
import { useSync } from '../hooks/useSync';
import { requestNotificationPermission } from '../utils/notify';
import { toast } from '../components/Toast';
import { cnDate } from '../utils/date';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const navigate = useNavigate();
  const preferences = useScheduleStore((s) => s.preferences);
  const updatePreferences = useScheduleStore((s) => s.updatePreferences);
  const plans = useScheduleStore((s) => s.plans);
  const setPlans = useScheduleStore((s) => s.setPlans);
  const init = useScheduleStore((s) => s.init);
  const { lastSyncedAt, status, push, pull } = useSync();

  const [gistId, setGistId] = useState('');
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [testing, setTesting] = useState(false);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const c = getCredentials();
    setGistId(c.gistId);
    setPat(c.pat);
    void refreshLast();
  }, []);

  async function refreshLast() {
    const t = await getLastSyncedAt();
    // 通过重渲染触发 lastSyncedAt 变化
    void t;
    forceUpdate({});
  }

  const handleTest = async () => {
    setTesting(true);
    const c = getCredentials();
    if (!c.gistId || !c.pat) {
      setCredentials(gistId, pat);
    }
    const res = await testConnection();
    setTesting(false);
    if (res.ok) {
      toast('连接成功 ✓', 'success');
    } else {
      toast(res.message, 'error');
    }
  };

  const handleSave = async () => {
    setCredentials(gistId, pat);
    toast('凭证已保存,稍后将自动同步', 'success');
  };

  const handleUnbind = () => {
    if (!confirm('确定解绑 Gist?本地数据将保留。')) return;
    clearCredentials();
    setGistId('');
    setPat('');
    toast('已解绑', 'info');
  };

  const handlePull = async () => {
    const res = await pull();
    if (res.updated) {
      await init();
      toast('已拉取最新数据', 'success');
    } else {
      toast(res.message, res.ok ? 'info' : 'error');
    }
  };

  const handlePush = async () => {
    const res = await push();
    toast(res.message, res.ok ? 'success' : 'error');
  };

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      await updatePreferences({ notificationsEnabled: true });
      toast('通知已启用', 'success');
    } else {
      toast('通知权限被拒绝', 'error');
    }
  };

  const handleExport = async () => {
    const payload = await loadPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('备份已下载', 'success');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.plans) throw new Error('无效的备份文件');
        await applyPayload(data);
        await init();
        toast(`已导入 ${data.plans.length} 个计划`, 'success');
      } catch (err) {
        toast(`导入失败: ${(err as Error).message}`, 'error');
      }
    };
    input.click();
  };

  const handleClearLocal = async () => {
    if (!confirm('确定清空所有本地数据?此操作不可恢复(云端数据不受影响)。')) return;
    setPlans([]);
    await applyPayload({
      version: 1,
      plans: [],
      achievements: [],
      preferences,
      streak: { current: 0, longest: 0, lastCheckInDate: null },
      experience: DEFAULT_EXPERIENCE,
      updatedAt: new Date().toISOString(),
    });
    await init();
    toast('本地数据已清空', 'info');
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <div className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-soft)]">
          settings
        </div>
        <h1 className="font-display text-3xl font-bold">设置</h1>
      </div>

      {/* 同步中心 */}
      <Section title="同步中心" icon={<Cloud size={18} />}>
        <div className="space-y-4">
          <div className={isConfigured() ? 'flex items-center gap-2 text-sm' : 'flex items-center gap-2 text-sm text-[var(--ink-soft)]'}>
            {isConfigured() ? <CheckCircle2 size={16} className="text-[var(--teal)]" /> : <CloudOff size={16} />}
            <span>
              {isConfigured() ? '已绑定 Gist' : '尚未绑定 Gist(数据仅存于本地)'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              Gist ID
            </label>
            <input
              value={gistId}
              onChange={(e) => setGistId(e.target.value)}
              placeholder="例如:abc1234567890..."
              className="w-full px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono text-sm focus:outline-none focus:shadow-brutal-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              Personal Access Token (gist 权限)
            </label>
            <div className="flex gap-2">
              <input
                type={showPat ? 'text' : 'password'}
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="ghp_..."
                className="flex-1 px-3 py-2.5 border-2 border-[var(--ink)] rounded-md bg-[var(--bg)] font-mono text-sm focus:outline-none focus:shadow-brutal-sm"
              />
              <BrutalButton variant="secondary" size="sm" onClick={() => setShowPat(!showPat)}>
                {showPat ? '隐藏' : '显示'}
              </BrutalButton>
            </div>
            <div className="text-[11px] text-[var(--ink-soft)] mt-1.5 leading-relaxed">
              PAT 仅保存在你的浏览器 localStorage,不上传到任何第三方。{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=gist&description=Schedule%20App"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--terracotta)] underline inline-flex items-center gap-0.5"
              >
                创建 token <ExternalLink size={10} />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <BrutalButton variant="primary" size="sm" onClick={handleSave}>
              保存凭证
            </BrutalButton>
            <BrutalButton variant="secondary" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Github size={14} />}
              测试连接
            </BrutalButton>
            {isConfigured() && (
              <>
                <BrutalButton variant="secondary" size="sm" onClick={handlePush}>
                  立即推送
                </BrutalButton>
                <BrutalButton variant="secondary" size="sm" onClick={handlePull}>
                  立即拉取
                </BrutalButton>
                <BrutalButton variant="danger" size="sm" onClick={handleUnbind}>
                  解绑
                </BrutalButton>
              </>
            )}
          </div>

          {status.state !== 'idle' && (
            <div
              className={`text-xs flex items-center gap-2 px-3 py-2 border-2 border-[var(--ink)] rounded-md ${
                status.state === 'error' ? 'bg-[var(--terracotta)]/10' :
                status.state === 'success' ? 'bg-[var(--teal)]/10' : 'bg-[var(--bg-soft)]'
              }`}
            >
              {status.state === 'syncing' && <RefreshCw size={12} className="animate-spin" />}
              {status.state === 'success' && <CheckCircle2 size={12} className="text-[var(--teal)]" />}
              {status.state === 'error' && <XCircle size={12} className="text-[var(--terracotta)]" />}
              {status.message}
            </div>
          )}

          {lastSyncedAt && (
            <div className="text-[11px] font-mono text-[var(--ink-soft)]">
              最后同步: {cnDate(lastSyncedAt, 'yyyy-M-d HH:mm')}
            </div>
          )}

          <details className="text-xs text-[var(--ink-soft)] border-2 border-dashed border-[var(--ink)]/30 rounded-md p-3">
            <summary className="cursor-pointer font-mono uppercase tracking-widest text-[10px] font-bold">
              如何创建 Gist?
            </summary>
            <ol className="list-decimal list-inside mt-2 space-y-1 leading-relaxed">
              <li>访问 <a href="https://gist.github.com/" target="_blank" rel="noreferrer" className="text-[var(--terracotta)] underline">gist.github.com</a></li>
              <li>文件名填写 <code className="bg-[var(--bg-soft)] px-1 rounded">schedule.json</code>,内容随意</li>
              <li>点击 "Create secret gist" 或 "Create public gist"</li>
              <li>复制 Gist ID(URL 最后那段)与 PAT 填入上方</li>
              <li>回到本页点击"保存凭证"即可</li>
            </ol>
          </details>
        </div>
      </Section>

      {/* 偏好设置 */}
      <Section title="偏好设置" icon={<Coffee size={18} />}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              主题
            </label>
            <div className="flex gap-2">
              {(['paper', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updatePreferences({ theme: t })}
                  className={`flex-1 px-3 py-2.5 border-2 border-[var(--ink)] rounded-md font-semibold text-sm capitalize transition-all ${
                    preferences.theme === t
                      ? 'bg-[var(--ink)] text-[var(--bg)] shadow-brutal-sm'
                      : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                  }`}
                >
                  {t === 'paper' ? <><Coffee size={14} className="inline mr-1" />纸质</> :
                   t === 'light' ? <><Sun size={14} className="inline mr-1" />明亮</> :
                   <><Moon size={14} className="inline mr-1" />深色</>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              一周起始
            </label>
            <div className="flex gap-2">
              {[{ v: 1, l: '周一' }, { v: 0, l: '周日' }].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => updatePreferences({ weekStart: opt.v as 0 | 1 })}
                  className={`flex-1 px-3 py-2 border-2 border-[var(--ink)] rounded-md font-semibold text-sm ${
                    preferences.weekStart === opt.v
                      ? 'bg-[var(--terracotta)] text-white shadow-brutal-sm'
                      : 'bg-[var(--bg)] hover:bg-[var(--bg-soft)]'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
              通知
            </label>
            <div className="flex items-center justify-between border-2 border-[var(--ink)] rounded-md p-3">
              <div className="flex items-center gap-2">
                <Bell size={16} />
                <div>
                  <div className="text-sm font-semibold">浏览器通知</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">允许在计划开始前弹出提醒</div>
                </div>
              </div>
              {preferences.notificationsEnabled ? (
                <Tag color="teal">已启用</Tag>
              ) : (
                <BrutalButton variant="primary" size="sm" onClick={handleEnableNotifications}>
                  启用
                </BrutalButton>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* 数据管理 */}
      <Section title="数据管理" icon={<Download size={18} />}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <BrutalButton variant="secondary" onClick={handleExport}>
              <Download size={14} />
              导出 JSON 备份
            </BrutalButton>
            <BrutalButton variant="secondary" onClick={handleImport}>
              <Upload size={14} />
              从 JSON 导入
            </BrutalButton>
            <BrutalButton variant="danger" onClick={handleClearLocal}>
              <Trash2 size={14} />
              清空本地数据
            </BrutalButton>
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] leading-relaxed">
            当前本地共 <strong>{plans.length}</strong> 个计划。云端数据通过 Gist 同步,本地与云端互不影响。
          </div>
        </div>
      </Section>

      {/* 关于 */}
      <Section title="关于" icon={<Github size={18} />}>
        <div className="text-sm text-[var(--ink-soft)] leading-relaxed space-y-2">
          <p>
            <strong>课表</strong> · 一款零后端的每日计划与课表应用。基于 GitHub Gist 实现多端同步,Netlify 静态托管。
          </p>
          <p>
            数据所有权归你所有,我们不存储任何数据。Gist 凭证仅在你的浏览器中保存。
          </p>
          <button
            onClick={() => navigate('/onboarding')}
            className="text-[var(--terracotta)] underline text-sm"
          >
            重新查看首次使用引导
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <BrutalCard className="mb-5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b-2 border-[var(--ink)] bg-[var(--bg-soft)]">
        {icon}
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </BrutalCard>
  );
}
