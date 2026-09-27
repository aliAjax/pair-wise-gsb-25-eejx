// 规则层：家长授权（允许填写的字段、截止时刻、撤回）与时间判定

import type { NurseFieldId } from "./fields";

export type AuthStatus = "not-issued" | "active" | "expired" | "revoked";

export interface Authorization {
  /** 家长勾选允许校医填写的字段；空数组表示什么都不允许 */
  scope: NurseFieldId[];
  /** 截止时刻（本地时间 yyyy-MM-ddTHH:mm），未发布时为 null */
  deadline: string | null;
  revoked: boolean;
  issuedAt: string | null;
  revokedAt: string | null;
  updatedAt: string | null;
}

export const EMPTY_AUTHORIZATION: Authorization = {
  scope: [],
  deadline: null,
  revoked: false,
  issuedAt: null,
  revokedAt: null,
  updatedAt: null,
};

export const AUTH_STATUS_LABEL: Record<AuthStatus, string> = {
  "not-issued": "未发布",
  active: "回传中",
  expired: "已截止",
  revoked: "已撤回",
};

/** 截止时刻比较到分钟；输入为空时视为无效，不做任何放行 */
export function isPastDeadline(deadline: string | null, now: number = Date.now()): boolean {
  if (!deadline) return true;
  const t = new Date(deadline).getTime();
  if (Number.isNaN(t)) return true;
  return now >= t;
}

export function getAuthStatus(auth: Authorization, now: number = Date.now()): AuthStatus {
  if (!auth.issuedAt || !auth.deadline) return "not-issued";
  if (auth.revoked) return "revoked";
  if (isPastDeadline(auth.deadline, now)) return "expired";
  return "active";
}

/** 家长撤回后新提交立即关闭；过期同样关闭 */
export function isChannelOpen(auth: Authorization, now: number = Date.now()): boolean {
  return getAuthStatus(auth, now) === "active";
}

export function isFieldAllowed(auth: Authorization, field: NurseFieldId): boolean {
  return auth.scope.includes(field);
}

/** 距截止时刻的剩余毫秒，未发布/撤回/已过期返回 null */
export function remainingMs(auth: Authorization, now: number = Date.now()): number | null {
  if (getAuthStatus(auth, now) !== "active" || !auth.deadline) return null;
  return new Date(auth.deadline).getTime() - now;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (days > 0 || hours > 0) parts.push(`${hours} 小时`);
  parts.push(`${String(minutes).padStart(2, "0")} 分`);
  parts.push(`${String(seconds).padStart(2, "0")} 秒`);
  return parts.join(" ");
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local 输入框的默认值：当前时间 + 指定分钟 */
export function defaultDeadline(minutesFromNow: number = 4320): string {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
