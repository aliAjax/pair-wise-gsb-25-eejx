// 规则层：校医回传提交的校验、拦截与入库结构（纯函数，不碰 DOM / 存储）

import type { NurseFieldId } from "./fields";
import { NURSE_FIELDS } from "./fields";
import type { Authorization, AuthStatus } from "./authorization";
import { getAuthStatus, isFieldAllowed } from "./authorization";

export type SubmissionInput = Record<NurseFieldId, string>;

export const EMPTY_INPUT: SubmissionInput = {
  leftVision: "",
  rightVision: "",
  advice: "",
};

export type SubmissionErrorCode =
  | "channel-not-issued"
  | "channel-revoked"
  | "channel-expired"
  | "scope-empty"
  | "field-not-allowed"
  | "required-missing"
  | "vision-format"
  | "advice-too-long";

export interface SubmissionError {
  code: SubmissionErrorCode;
  field?: NurseFieldId;
  message: string;
}

export interface SubmissionRecord {
  id: string;
  submittedAt: string;
  /** 提交瞬间的授权快照（范围 / 截止时刻 / 当时状态），便于事后审计 */
  scopeSnapshot: NurseFieldId[];
  deadlineSnapshot: string | null;
  authStatusSnapshot: AuthStatus;
  /** 只包含家长授权字段的值；越权字段即使填了也不会落库 */
  values: Partial<SubmissionInput>;
}

/** 裸眼视力：五分记录 4.0~5.3，或小数记录 0.1~2.0 */
export function isValidVision(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const n = Number(v);
  if (Number.isNaN(n)) return false;
  const isFivePoint = /^\d\.\d$/.test(v) && n >= 4.0 && n <= 5.3;
  const isDecimal = /^\d(\.\d{1,2})?$/.test(v) && n >= 0.1 && n <= 2.0;
  return isFivePoint || isDecimal;
}

/**
 * 校验一次提交。规则：
 * 1) 撤回 / 过期 / 未发布 → 通道关闭，整体挡下（输入保留）
 * 2) 越权字段填了内容 → 挡下并指明字段（输入保留）
 * 3) 授权字段必填，视力要符合记录法，建议限长
 */
export function validateSubmission(
  input: SubmissionInput,
  auth: Authorization,
  now: number = Date.now(),
): SubmissionError[] {
  const errors: SubmissionError[] = [];
  const status = getAuthStatus(auth, now);

  if (status === "not-issued") {
    errors.push({ code: "channel-not-issued", message: "家长尚未发布回传授权，提交已挡下，输入已保留。" });
    return errors;
  }
  if (status === "revoked") {
    errors.push({ code: "channel-revoked", message: "家长已撤回授权，新提交立即关闭，输入已保留。" });
    return errors;
  }
  if (status === "expired") {
    errors.push({ code: "channel-expired", message: "已超过家长设定的截止时刻，过期提交已挡下，输入已保留。" });
    return errors;
  }

  if (auth.scope.length === 0) {
    errors.push({ code: "scope-empty", message: "家长本次未勾选任何允许填写的字段，无法提交。" });
    return errors;
  }

  // 越权字段：即使界面上可输入，规则层照样挡下
  for (const field of NURSE_FIELDS) {
    const value = input[field.id].trim();
    if (!isFieldAllowed(auth, field.id) && value.length > 0) {
      errors.push({
        code: "field-not-allowed",
        field: field.id,
        message: `「${field.label}」不在家长授权范围内，填写内容已保留，但不能随本次提交。`,
      });
    }
  }

  for (const field of NURSE_FIELDS) {
    if (!isFieldAllowed(auth, field.id)) continue;
    const value = input[field.id].trim();
    if (!value) {
      errors.push({ code: "required-missing", field: field.id, message: `请填写授权字段「${field.label}」。` });
      continue;
    }
    if (field.kind === "vision" && !isValidVision(value)) {
      errors.push({ code: "vision-format", field: field.id, message: `「${field.label}」格式无效，应为 4.0–5.3 或 0.1–2.0。` });
    }
    if (field.id === "advice" && value.length > field.maxLength) {
      errors.push({ code: "advice-too-long", field: field.id, message: `「${field.label}」不能超过 ${field.maxLength} 字。` });
    }
  }

  return errors;
}

/** 白名单式落库：只保留授权字段，且重新校验格式；绝不写入越权字段 */
export function buildSubmissionRecord(
  input: SubmissionInput,
  auth: Authorization,
  now: number = Date.now(),
): SubmissionRecord {
  const values: Partial<SubmissionInput> = {};
  for (const field of NURSE_FIELDS) {
    if (!isFieldAllowed(auth, field.id)) continue;
    const value = input[field.id].trim();
    if (!value) continue;
    if (field.kind === "vision" && !isValidVision(value)) continue;
    if (field.id === "advice" && value.length > field.maxLength) continue;
    values[field.id] = value;
  }
  return {
    id: `sub-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    submittedAt: new Date(now).toISOString(),
    scopeSnapshot: [...auth.scope],
    deadlineSnapshot: auth.deadline,
    authStatusSnapshot: getAuthStatus(auth, now),
    values,
  };
}
