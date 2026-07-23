// IndexedDB 封装 - 通过 idb 库
import { openDB, type IDBPDatabase } from 'idb';
import type { GistPayload, PlanItem, Achievement, Streak, UserPreferences, Experience } from '../types';
import { DEFAULT_PREFERENCES, DEFAULT_STREAK, DEFAULT_EXPERIENCE, slotFromTime } from '../types';

const DB_NAME = 'schedule-app';
const DB_VERSION = 1;
const GIST_FILE_NAME = 'schedule.json';

interface MetaRecord {
  key: string;
  value: unknown;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('plans')) {
          const planStore = db.createObjectStore('plans', { keyPath: 'id' });
          planStore.createIndex('by_updatedAt', 'updatedAt');
          planStore.createIndex('by_type', 'type');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ----- Plans -----
export async function getAllPlans(): Promise<PlanItem[]> {
  const db = await getDB();
  const plans = await db.getAll('plans') as PlanItem[];
  // 兼容旧数据：自动补 slot 和 category 字段
  for (const p of plans) {
    if (!p.slot) {
      p.slot = slotFromTime(new Date(p.startTime).getHours());
    }
    if (!p.category) {
      p.category = 'routine';
    }
    if (!p.priority && p.category === 'todo') {
      p.priority = 'medium';
    }
  }
  return plans;
}

export async function savePlan(plan: PlanItem): Promise<void> {
  const db = await getDB();
  await db.put('plans', plan);
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('plans', id);
}

export async function bulkSavePlans(plans: PlanItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('plans', 'readwrite');
  await Promise.all(plans.map((p) => tx.store.put(p)));
  await tx.done;
}

// ----- Meta -----
export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const rec = (await db.get('meta', key)) as MetaRecord | undefined;
  return rec?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value });
}

// 初始化默认 meta
export async function initMeta(): Promise<void> {
  const prefs = await getMeta<UserPreferences>('preferences');
  if (!prefs) {
    await setMeta('preferences', DEFAULT_PREFERENCES);
  }
  const streak = await getMeta<Streak>('streak');
  if (!streak) {
    await setMeta('streak', DEFAULT_STREAK);
  }
  const achievements = await getMeta<Achievement[]>('achievements');
  if (!achievements) {
    await setMeta('achievements', []);
  }
  const experience = await getMeta<Experience>('experience');
  if (!experience) {
    await setMeta('experience', DEFAULT_EXPERIENCE);
  }
}

// ----- Payload 聚合 -----
export async function loadPayload(): Promise<GistPayload> {
  const plans = await getAllPlans();
  const prefs = (await getMeta<UserPreferences>('preferences')) || DEFAULT_PREFERENCES;
  const streak = (await getMeta<Streak>('streak')) || DEFAULT_STREAK;
  const achievements = (await getMeta<Achievement[]>('achievements')) || [];
  const experience = (await getMeta<Experience>('experience')) || DEFAULT_EXPERIENCE;
  return {
    version: 1,
    plans,
    achievements,
    preferences: prefs,
    streak,
    experience,
    updatedAt: new Date().toISOString(),
  };
}

export async function applyPayload(payload: GistPayload): Promise<void> {
  if (!payload || payload.version !== 1) return;
  const db = await getDB();
  // 替换 plans
  const tx = db.transaction(['plans', 'meta'], 'readwrite');
  await tx.objectStore('plans').clear();
  for (const p of payload.plans) {
    // 兼容旧数据：自动补 slot 和 category 字段
    if (!p.slot) {
      p.slot = slotFromTime(new Date(p.startTime).getHours());
    }
    if (!p.category) {
      p.category = 'routine';
    }
    if (!p.priority && p.category === 'todo') {
      p.priority = 'medium';
    }
    await tx.objectStore('plans').put(p);
  }
  await tx.objectStore('meta').put({ key: 'preferences', value: payload.preferences });
  await tx.objectStore('meta').put({ key: 'streak', value: payload.streak });
  await tx.objectStore('meta').put({ key: 'achievements', value: payload.achievements });
  // 兼容旧数据：experience 字段可能不存在
  const experience = payload.experience || DEFAULT_EXPERIENCE;
  await tx.objectStore('meta').put({ key: 'experience', value: experience });
  await tx.done;
}

export { GIST_FILE_NAME };
