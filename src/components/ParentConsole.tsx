// 页面层：家长端 —— 发布/撤回回传授权，管理仅家长可见的处方与家庭资料

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  NURSE_FIELDS,
  FAMILY_FIELDS,
  PRESCRIPTION_FIELDS,
  type FamilyData,
  type NurseFieldId,
  type PrescriptionData,
} from "../rules/fields";
import {
  defaultDeadline,
  formatCountdown,
  formatDateTime,
  getAuthStatus,
  remainingMs,
  type Authorization,
} from "../rules/authorization";
import type { SubmissionRecord } from "../rules/submission";
import { Banner, RecordsList, StatusBadge } from "./shared";

interface ParentConsoleProps {
  auth: Authorization;
  setAuth: Dispatch<SetStateAction<Authorization>>;
  family: FamilyData;
  setFamily: Dispatch<SetStateAction<FamilyData>>;
  prescription: PrescriptionData;
  setPrescription: Dispatch<SetStateAction<PrescriptionData>>;
  submissions: SubmissionRecord[];
  now: number;
}

interface PrivateFieldInput {
  id: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

function PrivateDataCard({
  title,
  description,
  fields,
  values,
  onChange,
}: {
  title: string;
  description: string;
  fields: PrivateFieldInput[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  return (
    <section className="panel private-card">
      <div className="private-tag">仅家长可见</div>
      <h2>{title}</h2>
      <p className="card-desc">{description}</p>
      <div className="field-grid">
        {fields.map((field) => (
          <label key={field.id} className={field.multiline ? "full-span" : ""}>
            <span>{field.label}</span>
            {field.multiline ? (
              <textarea
                rows={2}
                value={values[field.id]}
                placeholder={field.placeholder}
                onChange={(e) => onChange({ ...values, [field.id]: e.target.value })}
              />
            ) : (
              <input
                value={values[field.id]}
                placeholder={field.placeholder}
                onChange={(e) => onChange({ ...values, [field.id]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <p className="save-hint">本地自动保存，校医端无法查看本卡片内容。</p>
    </section>
  );
}

export function ParentConsole({
  auth,
  setAuth,
  family,
  setFamily,
  prescription,
  setPrescription,
  submissions,
  now,
}: ParentConsoleProps) {
  const [draftScope, setDraftScope] = useState<NurseFieldId[]>(auth.scope.length ? auth.scope : ["leftVision", "rightVision", "advice"]);
  const [draftDeadline, setDraftDeadline] = useState<string>(auth.deadline ?? defaultDeadline());
  const [formError, setFormError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const status = getAuthStatus(auth, now);
  const remain = remainingMs(auth, now);

  const toggleField = (id: NurseFieldId) => {
    setDraftScope((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const publish = () => {
    setFormError(null);
    const ts = draftDeadline ? new Date(draftDeadline).getTime() : NaN;
    if (Number.isNaN(ts)) {
      setFormError("请选择有效的截止时刻。");
      return;
    }
    if (ts <= Date.now()) {
      setFormError("截止时刻必须晚于当前时间，否则校医无法回传。");
      return;
    }
    if (draftScope.length === 0) {
      setFormError("至少勾选一个允许校医填写的字段。");
      return;
    }
    const tsIso = new Date().toISOString();
    setAuth((prev) => ({
      scope: [...draftScope],
      deadline: draftDeadline,
      revoked: false,
      issuedAt: prev.issuedAt ?? tsIso,
      revokedAt: null,
      updatedAt: tsIso,
    }));
    setFlash(auth.issuedAt && auth.revoked ? "已重新授权，回传通道重新开启。" : "授权已发布，校医可在截止时刻前回传。");
    setConfirmRevoke(false);
    window.setTimeout(() => setFlash(null), 4000);
  };

  const revoke = () => {
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    const tsIso = new Date().toISOString();
    setAuth((prev) => ({ ...prev, revoked: true, revokedAt: tsIso, updatedAt: tsIso }));
    setConfirmRevoke(false);
    setFlash("授权已撤回，校医的新提交将立即被挡下；已接收记录仍可在此查看。");
    window.setTimeout(() => setFlash(null), 5000);
  };

  const acceptedCount = useMemo(
    () => submissions.filter((r) => r.authStatusSnapshot === "active").length,
    [submissions],
  );

  return (
    <div className="console-stack">
      <section className="panel auth-panel">
        <div className="section-heading">
          <div>
            <p>家长授权</p>
            <h2>限期回传授权书</h2>
          </div>
          <StatusBadge status={status} />
        </div>

        {status === "active" && (
          <Banner tone="ok">
            回传通道开启中，距截止还有 <strong>{remain !== null ? formatCountdown(remain) : "—"}</strong>
            ，截止时刻：{formatDateTime(auth.deadline)}。
          </Banner>
        )}
        {status === "expired" && (
          <Banner tone="warn">已过截止时刻（{formatDateTime(auth.deadline)}），校医的新提交会被挡下；重新设定截止时刻并发布即可恢复。</Banner>
        )}
        {status === "revoked" && (
          <Banner tone="error">授权已撤回（{formatDateTime(auth.revokedAt)}），校医的新提交立即关闭；下方 {acceptedCount} 条已接收记录仍可查看。</Banner>
        )}
        {status === "not-issued" && (
          <Banner tone="info">尚未发布授权。勾选允许校医填写的字段并设定截止时刻后发布，校医端才会开启回传表单。</Banner>
        )}
        {flash && <Banner tone="ok">{flash}</Banner>}

        <div className="auth-layout">
          <div>
            <h3 className="block-title">允许校医填写的字段</h3>
            <div className="scope-options">
              {NURSE_FIELDS.map((field) => {
                const checked = draftScope.includes(field.id);
                return (
                  <label key={field.id} className={`scope-option ${checked ? "checked" : ""}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleField(field.id)} />
                    <span className="scope-label">{field.label}</span>
                    <small>{field.hint}</small>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="block-title">截止时刻</h3>
            <label className="deadline-picker">
              <span>校医必须在此之前提交，过期提交一律挡下</span>
              <input type="datetime-local" value={draftDeadline} onChange={(e) => setDraftDeadline(e.target.value)} />
            </label>
            {auth.issuedAt && (
              <p className="meta-line">
                最近发布：{formatDateTime(auth.updatedAt ?? auth.issuedAt)}
                {auth.revokedAt ? ` ｜撤回于：${formatDateTime(auth.revokedAt)}` : ""}
              </p>
            )}
          </div>
        </div>

        {formError && <Banner tone="error">{formError}</Banner>}

        <div className="action-row">
          <button className="primary-action" onClick={publish}>
            {status === "not-issued" ? "发布授权" : "按以上范围重新发布"}
          </button>
          {status === "active" && (
            <button className="danger-action" onClick={revoke}>
              {confirmRevoke ? "再次点击确认撤回" : "撤回授权"}
            </button>
          )}
          {confirmRevoke && status === "active" && (
            <button className="ghost-action" onClick={() => setConfirmRevoke(false)}>
              保留授权
            </button>
          )}
        </div>
        <p className="rule-note">
          撤回立即生效：校医端新提交马上关闭；已接收的回传记录不会删除，仍可在下方查阅。校医只能提交被勾选字段，越权字段与过期提交会被挡下并保留输入。
        </p>
      </section>

      <PrivateDataCard
        title="家庭资料"
        description="完整病历中的家庭信息，只在家长端显示，不会随回传给校医。"
        fields={FAMILY_FIELDS}
        values={family}
        onChange={(next) => setFamily(next as FamilyData)}
      />
      <PrivateDataCard
        title="处方与医嘱"
        description="医院处方属于敏感病历，只对家长开放；校医回传仅限裸眼视力与复查建议。"
        fields={PRESCRIPTION_FIELDS}
        values={prescription}
        onChange={(next) => setPrescription(next as PrescriptionData)}
      />

      <RecordsList role="parent" records={submissions} emptyHint="还没有接收到校医的回传记录。" />
    </div>
  );
}
