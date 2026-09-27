import { useEffect, useState } from "react";
import "./styles.css";
import type { Role } from "./rules/fields";
import {
  ensureSeed,
  loadAuth,
  loadDraft,
  loadFamily,
  loadPrescription,
  loadRole,
  loadSubmissions,
  saveAuth,
  saveDraft,
  saveFamily,
  savePrescription,
  saveRole,
  saveSubmissions,
  useStoredState,
} from "./storage/repository";
import { ParentConsole } from "./components/ParentConsole";
import { NurseConsole } from "./components/NurseConsole";

function App() {
  ensureSeed();

  const [role, setRole] = useState<Role>(loadRole);
  const [now, setNow] = useState<number>(() => Date.now());

  const [auth, setAuth] = useStoredState("auth", loadAuth, saveAuth);
  const [submissions, setSubmissions] = useStoredState("submissions", loadSubmissions, saveSubmissions);
  const [draft, setDraft] = useStoredState("draft", loadDraft, saveDraft);
  const [family, setFamily] = useStoredState("family", loadFamily, saveFamily);
  const [prescription, setPrescription] = useStoredState("prescription", loadPrescription, savePrescription);

  // 每秒刷新一次，驱动截止倒计时与“已截止/回传中”状态
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const switchRole = (next: Role) => {
    setRole(next);
    saveRole(next);
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">学校视力筛查 · 限期回传台</p>
          <h1>授权范围内的视力回传</h1>
          <p className="subtitle">
            家长勾选允许校医填写的字段并设定截止时刻；校医只能提交左右眼裸眼视力与复查建议。越权字段与过期提交一律挡下且保留输入，家长撤回后新提交立即关闭，已接收记录仍可查阅；处方与家庭资料只对家长显示。
          </p>
        </div>
        <div className="stack-card">
          <span>当前身份</span>
          <div className="role-switch" role="tablist" aria-label="角色切换">
            <button
              role="tab"
              aria-selected={role === "parent"}
              className={role === "parent" ? "active role-parent" : "role-parent"}
              onClick={() => switchRole("parent")}
            >
              家长
            </button>
            <button
              role="tab"
              aria-selected={role === "nurse"}
              className={role === "nurse" ? "active role-nurse" : "role-nurse"}
              onClick={() => switchRole("nurse")}
            >
              校医
            </button>
          </div>
          <strong>{role === "parent" ? "家长端：管理授权与隐私病历" : "校医端：按授权限期回传"}</strong>
          <p className="persist-note">授权、草稿与记录保存在本机，重开页面仍然可见。</p>
        </div>
      </section>

      {role === "parent" ? (
        <ParentConsole
          auth={auth}
          setAuth={setAuth}
          family={family}
          setFamily={setFamily}
          prescription={prescription}
          setPrescription={setPrescription}
          submissions={submissions}
          now={now}
        />
      ) : (
        <NurseConsole
          auth={auth}
          draft={draft}
          setDraft={setDraft}
          submissions={submissions}
          setSubmissions={setSubmissions}
          now={now}
        />
      )}
    </main>
  );
}

export default App;
