// 同步 Hook - 自动推送与轮询
import { useEffect, useRef, useState } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { getLastSyncedAt, isConfigured, pullFromGist, pushToGist, type SyncStatus } from '../utils/sync';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const lastSyncedAtRef = useRef<string | null>(null);
  const isPullingRef = useRef(false);

  useEffect(() => {
    const unsub = useScheduleStore.subscribe((state) => {
      if (isPullingRef.current) return;
      schedulePush();
    });
    void refreshLastSynced();
    startPullLoop();
    if (isConfigured()) {
      void doPull();
    }
    return () => {
      unsub();
      stopPullLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshLastSynced() {
    const t = await getLastSyncedAt();
    lastSyncedAtRef.current = t;
    setLastSyncedAt(t);
  }

  function schedulePush() {
    if (!isConfigured()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      void doPush();
    }, 1500);
  }

  async function doPush(): Promise<{ ok: boolean; message: string }> {
    if (!isConfigured()) {
      setStatus({ state: 'unconfigured' });
      return { ok: false, message: '未配置 Gist' };
    }
    setStatus({ state: 'syncing', message: '正在同步到云端...' });
    const res = await pushToGist();
    if (res.ok) {
      setStatus({ state: 'success', message: res.message });
      await refreshLastSynced();
    } else {
      setStatus({ state: 'error', message: res.message });
    }
    return res;
  }

  async function doPull(): Promise<{ ok: boolean; message: string; updated?: boolean }> {
    if (!isConfigured()) {
      setStatus({ state: 'unconfigured' });
      return { ok: false, message: '未配置 Gist' };
    }
    isPullingRef.current = true;
    setStatus({ state: 'syncing', message: '正在拉取云端数据...' });
    const res = await pullFromGist();
    if (res.ok) {
      const state = useScheduleStore.getState();
      await state.init();
      setStatus({ state: 'success', message: res.message });
      await refreshLastSynced();
    } else {
      setStatus({ state: 'error', message: res.message });
    }
    isPullingRef.current = false;
    return res;
  }

  function startPullLoop() {
    stopPullLoop();
    pullTimer = setInterval(() => {
      if (isConfigured() && !isPullingRef.current) void doPull();
    }, 5 * 60 * 1000);
  }

  function stopPullLoop() {
    if (pullTimer) {
      clearInterval(pullTimer);
      pullTimer = null;
    }
  }

  return {
    status,
    lastSyncedAt,
    push: doPush,
    pull: doPull,
  };
}
