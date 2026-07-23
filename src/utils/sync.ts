// GitHub Gist 同步逻辑
import type { GistPayload } from '../types';
import { applyPayload, getMeta, loadPayload, setMeta, GIST_FILE_NAME } from './idb';

const GIST_API = 'https://api.github.com';

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error' | 'unconfigured';
  message?: string;
  lastSyncedAt?: string | null;
}

export function getCredentials(): { gistId: string; pat: string } {
  return {
    gistId: localStorage.getItem('gistId') || '',
    pat: localStorage.getItem('pat') || '',
  };
}

export function setCredentials(gistId: string, pat: string) {
  // 简单的 base64 编码作为最低限度遮挡,真正的加密需要 Web Crypto
  localStorage.setItem('gistId', gistId.trim());
  localStorage.setItem('pat', btoa(pat.trim()));
}

export function clearCredentials() {
  localStorage.removeItem('gistId');
  localStorage.removeItem('pat');
}

export function isConfigured(): boolean {
  const { gistId, pat } = getCredentials();
  return !!(gistId && pat);
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const { gistId, pat } = getCredentials();
  if (!gistId || !pat) return { ok: false, message: '请先填写 Gist ID 和 PAT' };
  try {
    const res = await fetch(`${GIST_API}/gists/${gistId}`, {
      headers: { Authorization: `token ${atob(pat)}` },
    });
    if (res.status === 404) return { ok: false, message: '找不到该 Gist,请检查 ID' };
    if (res.status === 401) return { ok: false, message: 'PAT 无效或权限不足' };
    if (!res.ok) return { ok: false, message: `连接失败: HTTP ${res.status}` };
    return { ok: true, message: '连接成功' };
  } catch (e) {
    return { ok: false, message: `网络错误: ${(e as Error).message}` };
  }
}

export async function pushToGist(): Promise<{ ok: boolean; message: string }> {
  const { gistId, pat } = getCredentials();
  if (!gistId || !pat) return { ok: false, message: '未配置 Gist' };
  const payload = await loadPayload();
  payload.updatedAt = new Date().toISOString();
  try {
    const res = await fetch(`${GIST_API}/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${atob(pat)}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        files: {
          [GIST_FILE_NAME]: {
            content: JSON.stringify(payload, null, 2),
          },
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `推送失败: ${res.status} ${text.slice(0, 200)}` };
    }
    const now = new Date().toISOString();
    await setMeta('lastSyncedAt', now);
    return { ok: true, message: '已同步到云端' };
  } catch (e) {
    return { ok: false, message: `网络错误: ${(e as Error).message}` };
  }
}

export async function pullFromGist(): Promise<{ ok: boolean; message: string; updated?: boolean }> {
  const { gistId, pat } = getCredentials();
  if (!gistId || !pat) return { ok: false, message: '未配置 Gist' };
  try {
    const res = await fetch(`${GIST_API}/gists/${gistId}`, {
      headers: {
        Authorization: `token ${atob(pat)}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) {
      return { ok: false, message: `拉取失败: HTTP ${res.status}` };
    }
    const data = await res.json();
    const file = data.files?.[GIST_FILE_NAME];
    if (!file || !file.content) {
      return { ok: false, message: 'Gist 中暂无 schedule.json' };
    }
    const remote: GistPayload = JSON.parse(file.content);
    const local = await loadPayload();
    const remoteTime = new Date(remote.updatedAt || 0).getTime();
    const localTime = new Date(local.updatedAt || 0).getTime();
    if (remoteTime > localTime) {
      await applyPayload(remote);
      const now = new Date().toISOString();
      await setMeta('lastSyncedAt', now);
      return { ok: true, message: '已从云端拉取最新数据', updated: true };
    }
    return { ok: true, message: '已是最新数据', updated: false };
  } catch (e) {
    return { ok: false, message: `网络错误: ${(e as Error).message}` };
  }
}

export async function getLastSyncedAt(): Promise<string | null> {
  return (await getMeta<string>('lastSyncedAt')) || null;
}
