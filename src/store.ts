// 存取层：localStorage 持久化，重开页面后授权与回传记录仍在。

import type { FieldValues, Grant } from "./rules";

export interface Submission {
  id: string;
  values: FieldValues;
  submittedAt: string;
}

/** 完整病历中的敏感部分：只对家长显示，校医侧永不读取 */
export interface PrivateRecord {
  childName: string;
  className: string;
  prescription: string;
  familyInfo: string;
}

const KEYS = {
  grant: "vs.grant.v1",
  submissions: "vs.submissions.v1",
  record: "vs.record.v1",
};

const DEFAULT_RECORD: PrivateRecord = {
  childName: "张同学",
  className: "三年级二班",
  prescription: "散瞳验光：右眼 -1.25DS，左眼 -1.50DS；已配镜，建议三个月后复查眼轴。",
  familyInfo: "父亲近视 -4.00D，母亲视力正常；家庭联系方式与住址已登记，仅家长本人可查。",
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储不可用时静默失败，页面仍可在会话内使用
  }
}

export function loadGrant(): Grant | null {
  return read<Grant>(KEYS.grant);
}

export function saveGrant(grant: Grant | null): void {
  if (grant === null) localStorage.removeItem(KEYS.grant);
  else write(KEYS.grant, grant);
}

export function loadSubmissions(): Submission[] {
  return read<Submission[]>(KEYS.submissions) ?? [];
}

export function appendSubmission(values: FieldValues): Submission {
  const list = loadSubmissions();
  const item: Submission = {
    id: `S-${Date.now()}`,
    values,
    submittedAt: new Date().toISOString(),
  };
  write(KEYS.submissions, [...list, item]);
  return item;
}

export function loadPrivateRecord(): PrivateRecord {
  const existing = read<PrivateRecord>(KEYS.record);
  if (existing) return existing;
  write(KEYS.record, DEFAULT_RECORD);
  return DEFAULT_RECORD;
}
