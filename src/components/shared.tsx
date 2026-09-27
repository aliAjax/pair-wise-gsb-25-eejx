// 页面层：共享小组件

import type { ReactNode } from "react";
import type { Role } from "../rules/fields";
import { NURSE_FIELDS } from "../rules/fields";
import type { AuthStatus } from "../rules/authorization";
import { AUTH_STATUS_LABEL, formatDateTime } from "../rules/authorization";
import type { SubmissionRecord } from "../rules/submission";

export function StatusBadge({ status }: { status: AuthStatus }) {
  return <span className={`badge badge-${status}`}>{AUTH_STATUS_LABEL[status]}</span>;
}

export function Banner({ tone, children }: { tone: "ok" | "error" | "info" | "warn"; children: ReactNode }) {
  return (
    <div className={`banner banner-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

function FieldLine({ id, value }: { id: string; value: string }) {
  const def = NURSE_FIELDS.find((f) => f.id === id);
  return (
    <div className="record-field">
      <span>{def?.label ?? id}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function RecordsList({
  records,
  role,
  emptyHint,
}: {
  records: SubmissionRecord[];
  role: Role;
  emptyHint: string;
}) {
  const ordered = [...records].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return (
    <section className="panel records-panel">
      <div className="section-heading">
        <div>
          <p>{role === "parent" ? "家长可见" : "校医可见"}</p>
          <h2>已接收的回传记录</h2>
        </div>
        <span className="count-pill">{ordered.length} 条</span>
      </div>

      {ordered.length === 0 ? (
        <p className="empty-hint">{emptyHint}</p>
      ) : (
        <div className="record-list">
          {ordered.map((record, index) => (
            <article key={record.id} className="record-card">
              <div className="record-index">{String(ordered.length - index).padStart(2, "0")}</div>
              <div className="record-body">
                <div className="record-meta">
                  <h3>回传时间 {formatDateTime(record.submittedAt)}</h3>
                  <span className={`badge badge-${record.authStatusSnapshot === "active" ? "active" : "expired"}`}>
                    {record.authStatusSnapshot === "active" ? "期限内接收" : AUTH_STATUS_LABEL[record.authStatusSnapshot] ?? record.authStatusSnapshot}
                  </span>
                </div>
                <div className="record-fields">
                  {Object.entries(record.values).map(([id, value]) => (
                    <FieldLine key={id} id={id} value={String(value)} />
                  ))}
                </div>
                {role === "parent" && (
                  <>
                    <p className="record-snapshot">
                      本次授权范围：
                      {record.scopeSnapshot.length
                        ? record.scopeSnapshot
                            .map((id) => NURSE_FIELDS.find((f) => f.id === id)?.label ?? id)
                            .join("、")
                        : "（无）"}
                      ｜截止时刻：{formatDateTime(record.deadlineSnapshot)}
                    </p>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {role === "nurse" && (
        <p className="visibility-note">校医端仅显示授权范围内的回传内容；处方与家庭资料不对校医展示。</p>
      )}
    </section>
  );
}
