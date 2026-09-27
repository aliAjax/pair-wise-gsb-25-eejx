// 页面层 · 校医端：仅在家长授权范围内、截止时刻前提交；被挡下时保留输入。

import { useState } from "react";
import {
  EMPTY_VALUES,
  RETURN_FIELDS,
  STATUS_TEXT,
  evaluateSubmission,
  formatDateTime,
  grantStatus,
  type FieldKey,
  type FieldValues,
  type Grant,
} from "../rules";
import type { Submission } from "../store";

interface Props {
  grant: Grant | null;
  submissions: Submission[];
  onSubmit: (values: FieldValues) => void;
}

export function DoctorPage({ grant, submissions, onSubmit }: Props) {
  const [values, setValues] = useState<FieldValues>({ ...EMPTY_VALUES });
  const [reasons, setReasons] = useState<string[]>([]);
  const [outOfScope, setOutOfScope] = useState<FieldKey[]>([]);
  const [okTip, setOkTip] = useState("");

  const status = grantStatus(grant);
  const allowed = grant?.allowedFields ?? [];

  const setValue = (key: FieldKey, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const submit = () => {
    const result = evaluateSubmission(grant, values);
    setOkTip("");
    if (!result.ok) {
      // 挡下：保留输入，仅提示原因并标出越权字段
      setReasons(result.reasons);
      setOutOfScope(result.outOfScope);
      return;
    }
    onSubmit(values);
    setValues({ ...EMPTY_VALUES });
    setReasons([]);
    setOutOfScope([]);
    setOkTip("提交成功，已回传给家长。");
  };

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p>校医端</p>
            <h2>视力回传</h2>
          </div>
          <span className={`badge badge-${status}`}>{STATUS_TEXT[status]}</span>
        </div>

        {status === "active" ? (
          <p className="hint">
            授权字段：{RETURN_FIELDS.filter((f) => allowed.includes(f.key)).map((f) => f.label).join("、")}
            {grant?.deadline && <>　·　截止 {formatDateTime(grant.deadline)}</>}
          </p>
        ) : (
          <p className="warn-text">
            {status === "none" && "家长尚未开启授权，暂不能回传。"}
            {status === "revoked" && "家长已撤回授权，回传通道已关闭。"}
            {status === "expired" && "已超过截止时刻，回传通道已关闭。"}
          </p>
        )}

        <div className="field-grid">
          {RETURN_FIELDS.map((f) => {
            const isAllowed = allowed.includes(f.key);
            const blocked = outOfScope.includes(f.key);
            return (
              <label key={f.key} className={blocked ? "field-blocked" : ""}>
                <span>
                  {f.label}
                  {!isAllowed && <i className="tag-noauth">未授权</i>}
                </span>
                {f.key === "advice" ? (
                  <textarea
                    rows={3}
                    placeholder={f.placeholder}
                    value={values[f.key]}
                    onChange={(e) => setValue(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    placeholder={f.placeholder}
                    value={values[f.key]}
                    onChange={(e) => setValue(f.key, e.target.value)}
                  />
                )}
              </label>
            );
          })}
        </div>

        {reasons.length > 0 && (
          <div className="error-box">
            <strong>提交被挡下，您填写的内容已保留：</strong>
            <ul>
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {okTip && <p className="ok-text">{okTip}</p>}

        <div className="action-row">
          <button className="primary-action" onClick={submit}>
            提交回传
          </button>
        </div>
        <p className="hint">处方与家庭资料不在回传范围内，校医端不可见。</p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>历史</p>
            <h2>已接收记录</h2>
          </div>
        </div>
        {submissions.length === 0 ? (
          <p className="hint">暂无已接收记录。</p>
        ) : (
          <div className="record-list">
            {[...submissions].reverse().map((s) => (
              <article key={s.id} className="record-card">
                <div className="record-index">{s.id.slice(-4)}</div>
                <div>
                  <h3>{formatDateTime(s.submittedAt)}</h3>
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
