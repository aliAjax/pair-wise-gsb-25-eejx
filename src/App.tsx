import { useState } from "react";
import "./styles.css";
import type { FieldValues, Grant } from "./rules";
import {
  appendSubmission,
  loadGrant,
  loadPrivateRecord,
  loadSubmissions,
  saveGrant,
  type Submission,
} from "./store";
import { ParentPage } from "./pages/ParentPage";
import { DoctorPage } from "./pages/DoctorPage";

type Role = "parent" | "doctor";

function App() {
  const [role, setRole] = useState<Role>("parent");
  const [grant, setGrant] = useState<Grant | null>(() => loadGrant());
  const [submissions, setSubmissions] = useState<Submission[]>(() => loadSubmissions());
  const [record] = useState(() => loadPrivateRecord());

  const handleSaveGrant = (next: Grant) => {
    saveGrant(next);
    setGrant(next);
  };

  const handleRevoke = () => {
    if (!grant) return;
    const revoked: Grant = { ...grant, revokedAt: new Date().toISOString() };
    saveGrant(revoked);
    setGrant(revoked);
  };

  const handleSubmit = (values: FieldValues) => {
    const item = appendSubmission(values);
    setSubmissions((prev) => [...prev, item]);
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-11 · 学校视力筛查</p>
          <h1>限期回传台</h1>
          <p className="subtitle">
            家长勾选允许回传的字段并设定截止时刻；校医只能在授权范围内提交左右眼裸眼视力与复查建议。
            越权或过期提交会被挡下且保留输入；撤回授权后新提交立即关闭，已接收记录仍可查。
          </p>
        </div>
        <div className="stack-card">
          <span>当前身份</span>
          <div className="role-tabs">
            <button
              className={role === "parent" ? "active" : ""}
              onClick={() => setRole("parent")}
            >
              家长
            </button>
            <button
              className={role === "doctor" ? "active" : ""}
              onClick={() => setRole("doctor")}
            >
              校医
            </button>
          </div>
          <span className="hint">处方与家庭资料仅家长端显示</span>
        </div>
      </section>

      {role === "parent" ? (
        <ParentPage
          grant={grant}
          submissions={submissions}
          record={record}
          onSaveGrant={handleSaveGrant}
          onRevoke={handleRevoke}
        />
      ) : (
        <DoctorPage grant={grant} submissions={submissions} onSubmit={handleSubmit} />
      )}
    </main>
  );
}

export default App;
