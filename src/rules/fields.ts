// 规则层：字段目录与角色可见性（纯类型与常量，不依赖 React / 存储）

export type Role = "parent" | "nurse";

/** 校医可被授权回传的字段（家长逐项勾选） */
export type NurseFieldId = "leftVision" | "rightVision" | "advice";
export type NurseFieldKind = "vision" | "text";

export interface NurseFieldDef {
  id: NurseFieldId;
  label: string;
  kind: NurseFieldKind;
  placeholder: string;
  hint: string;
  maxLength: number;
  multiline?: boolean;
}

export const NURSE_FIELDS: NurseFieldDef[] = [
  {
    id: "leftVision",
    label: "左眼裸眼视力",
    kind: "vision",
    placeholder: "如 5.0",
    hint: "五分记录 4.0–5.3，或小数记录 0.1–2.0",
    maxLength: 4,
  },
  {
    id: "rightVision",
    label: "右眼裸眼视力",
    kind: "vision",
    placeholder: "如 5.1",
    hint: "五分记录 4.0–5.3，或小数记录 0.1–2.0",
    maxLength: 4,
  },
  {
    id: "advice",
    label: "复查建议",
    kind: "text",
    placeholder: "如：建议两周后到医院复查",
    hint: "校医给出的复查建议，最多 200 字",
    maxLength: 200,
    multiline: true,
  },
];

export const NURSE_FIELD_IDS = NURSE_FIELDS.map((field) => field.id);

export function getNurseField(id: string): NurseFieldDef | undefined {
  return NURSE_FIELDS.find((field) => field.id === id);
}

export function isNurseFieldId(value: string): value is NurseFieldId {
  return NURSE_FIELD_IDS.includes(value as NurseFieldId);
}

/** 处方与家庭资料属于完整病历的一部分，只对家长可见 */
export function canAccessPrivateRecords(role: Role): boolean {
  return role === "parent";
}

export type FamilyData = {
  childName: string;
  gradeClass: string;
  guardian: string;
  phone: string;
  address: string;
};

export type PrescriptionData = {
  hospital: string;
  diagnosis: string;
  rx: string;
  note: string;
};

export interface PrivateFieldDef<T extends string> {
  id: T;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

export const FAMILY_FIELDS: PrivateFieldDef<keyof FamilyData>[] = [
  { id: "childName", label: "孩子姓名", placeholder: "如：李小萌" },
  { id: "gradeClass", label: "年级班级", placeholder: "如：三年级（2）班" },
  { id: "guardian", label: "监护人", placeholder: "如：李女士" },
  { id: "phone", label: "联系电话", placeholder: "如：13800000000" },
  { id: "address", label: "家庭住址", placeholder: "仅家长端可见，不会回传给校医", multiline: true },
];

export const PRESCRIPTION_FIELDS: PrivateFieldDef<keyof PrescriptionData>[] = [
  { id: "hospital", label: "就诊医院", placeholder: "如：市眼科医院" },
  { id: "diagnosis", label: "诊断结论", placeholder: "如：双眼单纯性近视" },
  { id: "rx", label: "配镜处方", placeholder: "如：右眼 -2.75DS / 左眼 -2.50DS", multiline: true },
  { id: "note", label: "医嘱备注", placeholder: "如：增加户外活动，三个月后复诊", multiline: true },
];

export const EMPTY_FAMILY: FamilyData = {
  childName: "",
  gradeClass: "",
  guardian: "",
  phone: "",
  address: "",
};

export const EMPTY_PRESCRIPTION: PrescriptionData = {
  hospital: "",
  diagnosis: "",
  rx: "",
  note: "",
};
