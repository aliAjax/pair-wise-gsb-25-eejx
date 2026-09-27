// 规则层：纯函数，不依赖页面与存储，可独立测试。

export type FieldKey = "leftEye" | "rightEye" | "advice";

export interface FieldDef {
  key: FieldKey;
  label: string;
  placeholder: string;
}

/** 校医可回传的字段全集（家长从中勾选授权范围） */
export const RETURN_FIELDS: FieldDef[] = [
  { key: "leftEye", label: "左眼裸眼视力", placeholder: "如 4.8" },
  { key: "rightEye", label: "右眼裸眼视力", placeholder: "如 4.9" },
  { key: "advice", label: "复查建议", placeholder: "如 建议三个月后复查" },
];

export type FieldValues = Record<FieldKey, string>;

export const EMPTY_VALUES: FieldValues = { leftEye: "", rightEye: "", advice: "" };

/** 家长授权：允许填写的字段 + 截止时刻；revokedAt 非空表示已撤回 */
export interface Grant {
  allowedFields: FieldKey[];
  deadline: string | null; // ISO 时间
  updatedAt: string;
  revokedAt: string | null;
}

export type GrantStatus = "none" | "active" | "expired" | "revoked";

export const STATUS_TEXT: Record<GrantStatus, string> = {
  none: "未开启",
  active: "生效中",
  expired: "已过期",
  revoked: "已撤回",
};

export function grantStatus(grant: Grant | null, now: Date = new Date()): GrantStatus {
  if (!grant) return "none";
  if (grant.revokedAt) return "revoked";
  if (grant.deadline && now.getTime() > new Date(grant.deadline).getTime()) return "expired";
  return "active";
}

export interface Evaluation {
  ok: boolean;
  status: GrantStatus;
  reasons: string[];
  /** 填了内容但未获授权的字段 */
  outOfScope: FieldKey[];
}

/** 校验一次回传：越权字段、过期、撤回都会被挡下（调用方负责保留输入） */
export function evaluateSubmission(
  grant: Grant | null,
  values: FieldValues,
  now: Date = new Date()
): Evaluation {
  const status = grantStatus(grant, now);
  const reasons: string[] = [];

  if (status === "none") reasons.push("家长尚未开启回传授权，暂不能提交。");
  if (status === "revoked") reasons.push("家长已撤回授权，回传通道已关闭。");
  if (status === "expired" && grant?.deadline) {
    reasons.push(`已超过截止时刻 ${formatDateTime(grant.deadline)}，本次提交不予接收。`);
  }

  const allowed = grant?.allowedFields ?? [];
  const outOfScope = RETURN_FIELDS.filter(
    (f) => values[f.key].trim() !== "" && !allowed.includes(f.key)
  ).map((f) => f.key);
  if (outOfScope.length > 0) {
    const names = RETURN_FIELDS.filter((f) => outOfScope.includes(f.key))
      .map((f) => `「${f.label}」`)
      .join("、");
    reasons.push(`包含未授权字段 ${names}，请清空后再提交。`);
  }

  const hasContent = RETURN_FIELDS.some((f) => values[f.key].trim() !== "");
  if (!hasContent) reasons.push("表单为空，请至少填写一项内容。");

  return { ok: reasons.length === 0, status, reasons, outOfScope };
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO -> datetime-local 输入框格式 */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
