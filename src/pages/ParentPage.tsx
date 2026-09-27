// 页面层 · 家长端：勾选授权字段、设定截止时刻、撤回授权；查看回传记录与完整病历。

import { useState } from "react";
import {
  RETURN_FIELDS,
  STATUS_TEXT,
  formatDateTime,
  grantStatus,
  toLocalInput,
  type FieldKey,
  type Grant,
} from "../rules";
import type { PrivateRecord, Submission } from "../store";

interface Props {
  grant: Grant | null;
  submissions: Submission[];
  record: PrivateRecord;
  onSaveGrant: (grant: Grant) => void;
  onRevoke: () => void;
}

function StatusBadge({ grant }: { grant: Grant | null }) {
  const status = grantStatus(grant);
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_TEXT[status]}
      {grant?.deadline && status !== "none" && (
        <em> · 截止 {formatDateTime(grant.deadline)}</em>
      )}
    </span>
  );
}

export function ParentPage({ grant, submissions, record, onSaveGrant, onRevoke }: Props) {
  const [checked, setChecked] = useState<FieldKey[]>(grant?.allowedFields ?? []);
  const [deadline, setDeadline] = useState<string>(toLocalInput(grant?.deadline ?? null));
  const [savedTip, setSavedTip] = useState("");

  const status = grantStatus(grant);

  const toggle = (key: FieldKey) => {
    setChecked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const save = () => {
    if (checked.length === 0) {
      setSavedTip("请至少勾选一个允许回传的字段。");
      return;
    }
    if (!deadline) {
      setSavedTip("请设定截止时刻。");
      return;
    }
    onSaveGrant({
      allowedFields: checked,
      deadline: new Date(deadline).toISOString(),
      updatedAt: new Date().toISOString(),
      revokedAt: null, // 保存即（重新）开放通道
    });
    setSavedTip("授权已保存，回传通道已开启。");
  };

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p>家长端</p>
            <h2>回传授权设置</h2>
          </div>
          <StatusBadge grant={grant} />
        </div>

        <p className="hint">勾选允许校医填写的字段，并设定截止时刻；保存后校医端立即生效。</p>

        <div className="check-list">
          {RETURN_FIELDS.map((f) => (
            <label key={f.key} className="check-item">
              <input
                type="checkbox"
                checked={checked.includes(f.key)}
                onChange={() => toggle(f.key)}
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>

        <label className="deadline-field">
          <span>截止时刻</span>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>

        <div className="action-row">
          <button className="primary-action" onClick={save}>
            {status === "revoked" ? "重新开放并保存" : "保存授权"}
          </button>
          {grant && status !== "revoked" && (
            <button className="danger-action" onClick={onRevoke}>
              撤回授权
            </button>
          )}
        </div>
        {savedTip && <p className="tip">{savedTip}</p>}
        {status === "revoked" && (
          <p className="warn-text">授权已撤回：校医新的提交已被关闭，下方已接收记录仍可查看。</p>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>仅家长可见</p>
            <h2>孩子完整病历</h2>
          </div>
        </div>
        <dl className="record-detail">
          <dt>姓名 / 班级</dt>
          <dd>{record.childName} · {record.className}</dd>
          <dt>处方</dt>
          <dd>{record.prescription}</dd>
          <dt>家庭资料</dt>
          <dd>{record.familyInfo}</dd>
        </dl>
      </section>

      <section className="panel wide">
        <div className="section-heading">
          <div>
            <p>回传记录</p>
            <h2>已接收 {submissions.length} 条</h2>
          </div>
        </div>
        {submissions.length === 0 ? (
          <p className="hint">暂无回传记录。</p>
        ) : (
          <div className="record-list">
            {[...submissions].reverse().map((s) => (
              <article key={s.id} className="record-card">
                <div className="record-index">{s.id.slice(-4)}</div>
                <div>
                  <h3>{formatDateTime(s.submittedAt)} 接收</h3>
                  <p>
                    {RETURN_FIELDS.filter((f) => s.values[f.key].trim() !== "")
                      .map((f) => `${f.label}：${s.values[f.key]}`)
                      .join("　")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
