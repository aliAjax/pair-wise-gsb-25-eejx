// 页面层：校医端 —— 只能在家长授权范围与期限内提交左右眼裸眼视力与复查建议

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { NURSE_FIELDS, type NurseFieldId } from "../rules/fields";
import {
  formatCountdown,
  formatDateTime,
  getAuthStatus,
  isFieldAllowed,
  remainingMs,
  type Authorization,
} from "../rules/authorization";
import {
  buildSubmissionRecord,
  validateSubmission,
  type SubmissionError,
  type SubmissionInput,
  type SubmissionRecord,
} from "../rules/submission";
import { Banner, RecordsList, StatusBadge } from "./shared";

interface NurseConsoleProps {
  auth: Authorization;
  draft: SubmissionInput;
  setDraft: Dispatch<SetStateAction<SubmissionInput>>;
  submissions: SubmissionRecord[];
  setSubmissions: Dispatch<SetStateAction<SubmissionRecord[]>>;
  now: number;
}

const CHANNEL_ERROR_CODES = new Set(["channel-not-issued", "channel-revoked", "channel-expired", "scope-empty"]);

export function NurseConsole({ auth, draft, setDraft, submissions, setSubmissions, now }: NurseConsoleProps) {
  const [errors, setErrors] = useState<SubmissionError[]>([]);
  const [successAt, setSuccessAt] = useState<string | null>(null);

  const status = getAuthStatus(auth, now);
  const remain = remainingMs(auth, now);
  const open = status === "active";
  // 未发布 / 已截止 / 已撤回：只视觉置灰，不禁用输入——被挡下时仍可查看和编辑已保留的内容

  const fieldErrors = useMemo(() => {
    const map = {} as Partial<Record<NurseFieldId, string>>;
    for (const err of errors) {
      if (err.field && !map[err.field]) map[err.field] = err.message;
    }
    return map;
  }, [errors]);

  const channelErrors = errors.filter((e) => CHANNEL_ERROR_CODES.has(e.code));
  const unauthorizedTyped = NURSE_FIELDS.some(
    (f) => !isFieldAllowed(auth, f.id) && draft[f.id].trim().length > 0,
  );

  const updateField = (id: NurseFieldId, raw: string) => {
    const def = NURSE_FIELDS.find((f) => f.id === id);
    const value = def && !def.multiline ? raw.slice(0, def.maxLength) : raw;
    setDraft((prev) => ({ ...prev, [id]: value }));
    if (errors.length) setErrors([]);
    setSuccessAt(null);
  };

  const submit = () => {
    const found = validateSubmission(draft, auth, Date.now());
    setErrors(found);
    setSuccessAt(null);
    if (found.length > 0) {
      // 被挡下：不清空任何输入，草稿也已经持久化
      return;
    }
    const record = buildSubmissionRecord(draft, auth, Date.now());
    setSubmissions((prev) => [...prev, record]);
    const emptyDraft: SubmissionInput = { leftVision: "", rightVision: "", advice: "" };
    setDraft(emptyDraft);
    setErrors([]);
    setSuccessAt(formatDateTime(record.submittedAt));
  };

  return (
    <div className="console-stack">
      <section className="panel submit-panel">
        <div className="section-heading">
          <div>
            <p>校医回传台</p>
            <h2>视力筛查结果回传</h2>
          </div>
          <StatusBadge status={status} />
        </div>

        {status === "active" && (
          <Banner tone="ok">
            授权有效，剩余时间 <strong>{remain !== null ? formatCountdown(remain) : "—"}</strong>
            ，截止时刻：{formatDateTime(auth.deadline)}。请仅填写家长授权的字段。
          </Banner>
        )}
        {status === "not-issued" && <Banner tone="info">家长尚未发布回传授权，提交会被挡下；你可以先填写内容，草稿会自动保留，待授权发布后再提交。</Banner>}
        {status === "revoked" && <Banner tone="error">家长已撤回授权，新提交立即关闭。已填写内容已保留在本页，不会丢失。</Banner>}
        {status === "expired" && (
          <Banner tone="warn">
            已超过截止时刻 {formatDateTime(auth.deadline)}，过期提交会被挡下；输入内容继续保留，待家长重新授权后可再提交。
          </Banner>
        )}

        <div className="scope-summary">
          <span className="scope-summary-label">本次授权范围</span>
          {auth.issuedAt ? (
            NURSE_FIELDS.map((field) => (
              <span key={field.id} className={`scope-chip ${isFieldAllowed(auth, field.id) ? "allowed" : "denied"}`}>
                {field.label}
                {isFieldAllowed(auth, field.id) ? " · 允许" : " · 未授权"}
              </span>
            ))
          ) : (
            <span className="scope-chip denied">等待家长授权</span>
          )}
        </div>

        {channelErrors.map((err) => (
          <Banner key={err.code} tone="error">
            {err.message}
          </Banner>
        ))}
        {successAt && <Banner tone="ok">已于 {successAt} 成功回传，家长可在家长端查看；表单已清空。</Banner>}

        <fieldset className={`nurse-form ${open ? "" : "frozen"}`}>
          <div className="field-grid">
            {NURSE_FIELDS.map((field) => {
              const allowed = isFieldAllowed(auth, field.id);
              const value = draft[field.id];
              const overLimit = field.multiline && value.length > field.maxLength;
              return (
                <label key={field.id} className={`nurse-field full-span ${allowed ? "" : "unallowed"}`}>
                  <span className="nurse-field-head">
                    <span>{field.label}</span>
                    {auth.issuedAt && (
                      <em className={`lock-tag ${allowed ? "is-allowed" : ""}`}>{allowed ? "已授权" : "未授权 · 提交会被挡下"}</em>
                    )}
                  </span>
                  {field.multiline ? (
                    <textarea
                      rows={3}
                      value={value}
                      placeholder={allowed ? field.placeholder : `家长未授权「${field.label}」，此处输入仅作保留`}
                      onChange={(e) => updateField(field.id, e.target.value)}
                    />
                  ) : (
                    <input
                      inputMode="decimal"
                      value={value}
                      placeholder={allowed ? field.placeholder : "未授权字段"}
                      onChange={(e) => updateField(field.id, e.target.value)}
                    />
                  )}
                  <small className={overLimit ? "field-error-text" : "field-hint"}>
                    {fieldErrors[field.id] ?? `${field.hint}${field.multiline ? `（${value.length}/${field.maxLength}）` : ""}`}
                  </small>
                </label>
              );
            })}
          </div>
        </fieldset>

        {unauthorizedTyped && open && (
          <Banner tone="warn">有未授权字段被填写：这些内容会被保留在页面上，但提交时将被规则层挡下，请家长在授权中勾选后再提交。</Banner>
        )}

        <div className="action-row">
          <button className="primary-action" onClick={submit}>
            提交回传
          </button>
          <span className="save-hint">输入自动暂存本机；被挡下、过期或撤回都不会清空。</span>
        </div>
      </section>

      <RecordsList role="nurse" records={submissions} emptyHint="校医端暂无成功接收的回传记录。" />
    </div>
  );
}
