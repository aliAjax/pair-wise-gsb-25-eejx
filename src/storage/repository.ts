// 存取层：localStorage 持久化。只负责读写，不放业务判断。

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { Role } from "../rules/fields";
import {
  EMPTY_FAMILY,
  EMPTY_PRESCRIPTION,
  type FamilyData,
  type PrescriptionData,
  isNurseFieldId,
} from "../rules/fields";
import { EMPTY_AUTHORIZATION, type Authorization } from "../rules/authorization";
import { EMPTY_INPUT, type SubmissionInput, type SubmissionRecord } from "../rules/submission";

const NS = "vision-return-console:v1:";
const KEYS = {
  role: `${NS}role`,
  auth: `${NS}authorization`,
  submissions: `${NS}submissions`,
  draft: `${NS}nurse-draft`,
  family: `${NS}family`,
  prescription: `${NS}prescription`,
  seeded: `${NS}seeded`,
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 隐私模式等场景下降级为仅内存
  }
}

/** 首次打开写入示例：处方与家庭资料（仅家长可见），授权与回传记录从空开始 */
export function ensureSeed(): void {
  if (localStorage.getItem(KEYS.seeded)) return;
  write(KEYS.family, {
    ...EMPTY_FAMILY,
    childName: "李小萌（示例）",
    gradeClass: "三年级（2）班",
    guardian: "李女士",
    phone: "138****0000",
    address: "（示例家庭住址，仅家长端显示）",
  });
  write(KEYS.prescription, {
    ...EMPTY_PRESCRIPTION,
    hospital: "市眼科医院（示例）",
    diagnosis: "双眼单纯性近视",
    rx: "右眼 -2.75DS，左眼 -2.50DS",
    note: "每天户外活动不少于 2 小时，三个月后复诊。",
  });
  write(KEYS.submissions, []);
  write(KEYS.draft, EMPTY_INPUT);
  write(KEYS.auth, EMPTY_AUTHORIZATION);
  write(KEYS.seeded, "1");
}

/* ---------------- 角色 ---------------- */

export function loadRole(): Role {
  return localStorage.getItem(KEYS.role) === "nurse" ? "nurse" : "parent";
}
export function saveRole(role: Role): void {
  write(KEYS.role, role);
}

/* ---------------- 授权 ---------------- */

function sanitizeAuth(raw: Partial<Authorization>): Authorization {
  const scope = Array.isArray(raw.scope) ? raw.scope.filter(isNurseFieldId) : [];
  return {
    scope,
    deadline: typeof raw.deadline === "string" ? raw.deadline : null,
    revoked: Boolean(raw.revoked),
    issuedAt: typeof raw.issuedAt === "string" ? raw.issuedAt : null,
    revokedAt: typeof raw.revokedAt === "string" ? raw.revokedAt : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}
export function loadAuth(): Authorization {
  try {
    const raw = localStorage.getItem(KEYS.auth);
    return raw ? sanitizeAuth(JSON.parse(raw)) : { ...EMPTY_AUTHORIZATION };
  } catch {
    return { ...EMPTY_AUTHORIZATION };
  }
}
export function saveAuth(auth: Authorization): void {
  write(KEYS.auth, sanitizeAuth(auth));
}

/* ---------------- 回传记录 ---------------- */

export function loadSubmissions(): SubmissionRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.submissions);
    const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
    return Array.isArray(arr) ? (arr as SubmissionRecord[]) : [];
  } catch {
    return [];
  }
}
export function saveSubmissions(list: SubmissionRecord[]): void {
  write(KEYS.submissions, list);
}

/* ---------------- 校医草稿（被挡下后重开仍保留输入） ---------------- */

export function loadDraft(): SubmissionInput {
  const merged = { ...EMPTY_INPUT, ...read(KEYS.draft, { ...EMPTY_INPUT }) };
  return {
    leftVision: String(merged.leftVision ?? ""),
    rightVision: String(merged.rightVision ?? ""),
    advice: String(merged.advice ?? ""),
  };
}
export function saveDraft(draft: SubmissionInput): void {
  write(KEYS.draft, draft);
}

/* ---------------- 家长隐私资料 ---------------- */

export function loadFamily(): FamilyData {
  return read(KEYS.family, { ...EMPTY_FAMILY });
}
export function saveFamily(data: FamilyData): void {
  write(KEYS.family, data);
}

export function loadPrescription(): PrescriptionData {
  return read(KEYS.prescription, { ...EMPTY_PRESCRIPTION });
}
export function savePrescription(data: PrescriptionData): void {
  write(KEYS.prescription, data);
}

/* ---------------- React 绑定 ---------------- */

export function useStoredState<T>(key: string, loader: () => T, saver: (v: T) => void): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(loader);

  useEffect(() => {
    setState(loader());
    // 仅按 storage 键订阅，loader/saver 是稳定的模块函数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update: React.Dispatch<React.SetStateAction<T>> = (next) => {
    setState((prev) => {
      const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      saver(value);
      return value;
    });
  };
  return [state, update];
}
