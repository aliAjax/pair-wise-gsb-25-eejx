import {
  evaluateSubmission,
  grantStatus,
  type Grant,
} from "./src/rules";

const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok:", msg);
};

const base: Grant = {
  allowedFields: ["leftEye", "rightEye"],
  deadline: new Date(Date.now() + 3600_000).toISOString(),
  updatedAt: new Date().toISOString(),
  revokedAt: null,
};

// 1. 授权内提交通过
let r = evaluateSubmission(base, { leftEye: "4.8", rightEye: "4.9", advice: "" });
assert(r.ok, "授权字段内提交通过");

// 2. 越权字段被挡下并标出
r = evaluateSubmission(base, { leftEye: "4.8", rightEye: "", advice: "三月后复查" });
assert(!r.ok && r.outOfScope.includes("advice"), "填写未授权字段被挡下且标出 advice");

// 3. 过期被挡下
const expired: Grant = { ...base, deadline: new Date(Date.now() - 1000).toISOString() };
r = evaluateSubmission(expired, { leftEye: "4.8", rightEye: "", advice: "" });
assert(!r.ok && r.status === "expired", "过期提交被挡下");
assert(grantStatus(expired) === "expired", "状态为已过期");

// 4. 撤回后立即关闭（即使未过期）
const revoked: Grant = { ...base, revokedAt: new Date().toISOString() };
r = evaluateSubmission(revoked, { leftEye: "4.8", rightEye: "", advice: "" });
assert(!r.ok && r.status === "revoked", "撤回后新提交立即关闭");

// 5. 未授权时不能提交
r = evaluateSubmission(null, { leftEye: "4.8", rightEye: "", advice: "" });
assert(!r.ok && r.status === "none", "未开启授权不能提交");

// 6. 空表单被挡下
r = evaluateSubmission(base, { leftEye: " ", rightEye: "", advice: "" });
assert(!r.ok, "空表单被挡下");

console.log("全部规则断言通过");
