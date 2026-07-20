import React, { useMemo, useState } from "react";
import { suggestSlug, isValidSlug } from "../../lib/idSlug.js";
import { SECTION_LABELS } from "../../lib/sectionLabels.js";
import { buildSubjectPackage } from "../../lib/githubPublisher.js";
import SectionsManager from "./SectionsManager.jsx";
import FileUploaderWidget from "./FileUploaderWidget.jsx";
import PublishPanel from "./PublishPanel.jsx";

// ⚠️ ملف مملوك لعضو 3 — نموذج إضافة/تعديل مادة كامل.
//
// عقد التكامل الفعلي (موثّق أعلى lib/githubPublisher.js وبـ docs/data-schema.md §4،
// عضو 5/6): buildSubjectPackage({ subjectMeta, files }) → pkg، ثم <PublishPanel pkg={pkg} />
// كما هو، بدون أي معرفة بتفاصيل GitHub API. النقطة المهمة: نشرة واحدة (submit واحد)
// تخص دكتوراً واحداً كحد أقصى (professorId واحد) — إن كانت المادة متعددة الدكاترة،
// يختار المدير هنا "أي دكتور" يعدّل/يضيف له بهذه النشرة تحديداً.

const SECTION_KEYS = Object.keys(SECTION_LABELS);
const NEW_PROFESSOR_VALUE = "__new__";

function fileKey(f) {
  return `${f.name}-${f.size}`;
}

function slugifyTitle(name) {
  return name.replace(/\.pdf$/i, "");
}

/**
 * Props:
 *  - initialSubject?: subject.json كما هو (القسم 4.3) — غيابه يعني "مادة جديدة"
 *  - initialLecturesByVariant?: { [professorId|"_default"]: { sections: [...] } }
 *      بيانات lectures.json/lectures-{prof}.json الحالية، بلا فلترة hidden (لوحة تحكم).
 *  - existingIds?: string[] — لتفادي تكرار الـ id عند مادة جديدة
 *  - prefill?: { id, name, code } | null — تعبئة مبدئية من CurriculumCoursePicker
 *      (مادة جديدة مرتبطة بعنصر من الخطة الدراسية الرسمية). لا تأثير لها عند التعديل.
 */
export default function SubjectForm({
  initialSubject = null,
  initialLecturesByVariant = {},
  existingIds = [],
  prefill = null,
  existingStudyPlan = { courses: [] },
}) {
  const isEditing = Boolean(initialSubject?.id);
  const existingVariants = initialSubject?.professorVariants ?? [];

  const [name, setName] = useState(initialSubject?.name ?? prefill?.name ?? "");
  const [code, setCode] = useState(initialSubject?.code ?? prefill?.code ?? "");
  const [hidden, setHidden] = useState(initialSubject?.hidden ?? false);
  const [slug, setSlug] = useState(initialSubject?.id ?? prefill?.id ?? "");
  // slug من الخطة (prefill.id) مؤكَّد وصحيح أصلاً (نفس id بالخطة الرسمية)، فلا داعي
  // لإعادة اقتراحه تلقائياً من الاسم كما لو كُتب يدوياً.
  const [slugTouched, setSlugTouched] = useState(isEditing || Boolean(prefill));

  const [multiProfessor, setMultiProfessor] = useState(existingVariants.length > 0);

  // اختيار الدكتور المستهدف بهذه النشرة: id لدكتور موجود، أو NEW_PROFESSOR_VALUE
  const [professorChoice, setProfessorChoice] = useState(
    () => existingVariants.find((v) => v.active)?.professorId ?? existingVariants[0]?.professorId ?? NEW_PROFESSOR_VALUE
  );
  const [newProfessorId, setNewProfessorId] = useState("");
  const [newProfessorName, setNewProfessorName] = useState("");
  const [setActive, setSetActive] = useState(
    () => existingVariants.find((v) => v.professorId === professorChoice)?.active ?? true
  );

  const isNewProfessor = multiProfessor && professorChoice === NEW_PROFESSOR_VALUE;
  const effectiveProfessorId = isNewProfessor ? newProfessorId.trim() : professorChoice;
  const selectedExistingVariant = existingVariants.find((v) => v.professorId === professorChoice);
  const [professorNameOverride, setProfessorNameOverride] = useState(
    () => selectedExistingVariant?.professorName ?? ""
  );

  function selectProfessor(id) {
    setProfessorChoice(id);
    const v = existingVariants.find((x) => x.professorId === id);
    setProfessorNameOverride(v?.professorName ?? "");
    setSetActive(v?.active ?? existingVariants.length === 0);
    setNewProfessorId("");
    setNewProfessorName("");
  }

  // مفتاح بيانات المحاضرات الحالية المعروضة/القابلة للتعديل بـ SectionsManager
  const lecturesKey = multiProfessor
    ? isNewProfessor
      ? null // دكتور جديد: لا محاضرات سابقة
      : professorChoice
    : "_default";

  const [sections, setSections] = useState(
    () => initialLecturesByVariant[lecturesKey ?? "_default"]?.sections ?? []
  );

  function switchLecturesContext(nextKey) {
    setSections(initialLecturesByVariant[nextKey ?? "_default"]?.sections ?? []);
  }

  const [rawFiles, setRawFiles] = useState([]);
  const [fileMeta, setFileMeta] = useState({}); // key(fileKey) -> { title, section, hidden }
  // يتغيّر بعد كل نشر ناجح لإجبار FileUploaderWidget على إعادة التركيب (remount)
  // فيصفر قائمته الداخلية — يمنع نشر نفس الملفات مرة ثانية بالغلط.
  const [uploaderResetKey, setUploaderResetKey] = useState(0);

  function handlePublishSuccess() {
    setRawFiles([]);
    setFileMeta({});
    setUploaderResetKey((k) => k + 1);
  }

  function handleFilesSelected(files) {
    setRawFiles(files);
    setFileMeta((prev) => {
      const next = {};
      for (const f of files) {
        const k = fileKey(f);
        next[k] = prev[k] ?? { title: slugifyTitle(f.name), section: "theory", hidden: false };
      }
      return next;
    });
  }

  function updateFileMeta(key, patch) {
    setFileMeta((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  const otherIds = useMemo(
    () => existingIds.filter((id) => id !== initialSubject?.id),
    [existingIds, initialSubject]
  );

  function handleNameChange(value) {
    setName(value);
    if (!slugTouched) setSlug(suggestSlug(value));
  }

  function handleSlugChange(value) {
    setSlug(value);
    setSlugTouched(true);
  }

  const slugValid = slug.length > 0 && isValidSlug(slug, otherIds);
  const professorIdValid = !multiProfessor || (effectiveProfessorId && effectiveProfessorId.length > 0);
  const canBuildPackage = slugValid && name.trim().length > 0 && professorIdValid;

  const { pkg, buildError } = useMemo(() => {
    if (!canBuildPackage) return { pkg: null, buildError: null };
    try {
      const filesForPackage = rawFiles.map((f) => {
        const meta = fileMeta[fileKey(f)] ?? {};
        return {
          file: f,
          title: meta.title || slugifyTitle(f.name),
          section: SECTION_KEYS.includes(meta.section) ? meta.section : "theory",
          hidden: Boolean(meta.hidden),
        };
      });

      const subjectMeta = {
        id: slug,
        name,
        code,
        hidden,
        ...(multiProfessor
          ? {
              professorId: effectiveProfessorId,
              professorName: isNewProfessor ? newProfessorName || effectiveProfessorId : professorNameOverride,
              setActive,
            }
          : {}),
        ...(initialSubject ? { existingSubject: initialSubject } : {}),
        existingLectures: { sections },
        existingStudyPlan,
      };

      const built = buildSubjectPackage({ subjectMeta, files: filesForPackage });
      return { pkg: built, buildError: null };
    } catch (err) {
      return { pkg: null, buildError: err.message || String(err) };
    }
  }, [
    canBuildPackage,
    rawFiles,
    fileMeta,
    slug,
    name,
    code,
    hidden,
    multiProfessor,
    effectiveProfessorId,
    isNewProfessor,
    newProfessorName,
    professorNameOverride,
    setActive,
    sections,
    initialSubject,
    existingStudyPlan,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-h">بيانات المادة</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-text">
            اسم المادة
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-text"
              placeholder="مثال: الدارات الكهربائية"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text">
            الرقم الرسمي (code)
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-text"
              placeholder="مثال: 1130700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text">
            المعرّف (slug)
            <input
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              disabled={isEditing}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-text disabled:opacity-60"
              placeholder="circuits"
            />
            {!slugValid && slug.length > 0 && (
              <span className="text-xs text-danger-text">
                slug غير صالح أو مستخدم مسبقاً (أحرف إنجليزية صغيرة وأرقام وشرطات فقط)
              </span>
            )}
          </label>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              className="h-4 w-4"
            />
            إخفاء المادة بالكامل عن الطلاب
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-h">
          <input
            type="checkbox"
            checked={multiProfessor}
            onChange={(e) => setMultiProfessor(e.target.checked)}
            className="h-4 w-4"
          />
          هذه المادة متعددة الدكاترة
        </label>

        {multiProfessor && (
          <>
            <p className="mb-2 text-xs text-text-muted">
              كل نشرة (submit) تخص دكتوراً واحداً — اختر دكتوراً موجوداً لتحديث محاضراته، أو
              أضف دكتوراً جديداً.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={professorChoice}
                onChange={(e) => {
                  selectProfessor(e.target.value);
                  switchLecturesContext(
                    e.target.value === NEW_PROFESSOR_VALUE ? null : e.target.value
                  );
                }}
                className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
              >
                {existingVariants.map((v) => (
                  <option key={v.professorId} value={v.professorId}>
                    {v.professorName} {v.active ? "(نشِط حالياً)" : ""}
                  </option>
                ))}
                <option value={NEW_PROFESSOR_VALUE}>+ دكتور جديد</option>
              </select>

              {isNewProfessor && (
                <>
                  <input
                    value={newProfessorId}
                    onChange={(e) => setNewProfessorId(e.target.value)}
                    placeholder="professorId (مثال: prof-ahmad)"
                    className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
                  />
                  <input
                    value={newProfessorName}
                    onChange={(e) => setNewProfessorName(e.target.value)}
                    placeholder="اسم الدكتور (مثال: د. أحمد)"
                    className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
                  />
                </>
              )}

              {!isNewProfessor && professorChoice !== NEW_PROFESSOR_VALUE && (
                <input
                  value={professorNameOverride}
                  onChange={(e) => setProfessorNameOverride(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
                />
              )}

              <label className="flex items-center gap-1 text-xs text-text">
                <input
                  type="checkbox"
                  checked={setActive}
                  onChange={(e) => setSetActive(e.target.checked)}
                />
                اجعله الدكتور النشِط (المعروض افتراضياً للطلاب)
              </label>
            </div>
            {!professorIdValid && (
              <p className="mt-1 text-xs text-danger-text">أدخل professorId للدكتور الجديد.</p>
            )}
          </>
        )}
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <h2 className="mb-1 text-sm font-semibold text-text-h">المحاضرات والأقسام الحالية</h2>
        <p className="mb-3 text-xs text-text-muted">
          تعديل هنا (إخفاء/تسمية/حذف) يُحفظ كجزء من هذه النشرة حتى لو لم ترفع ملفات جديدة.
        </p>
        {isNewProfessor ? (
          <p className="text-xs text-text-muted">دكتور جديد — لا توجد محاضرات سابقة له بعد.</p>
        ) : (
          <SectionsManager sections={sections} onChange={setSections} />
        )}
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-h">رفع ملفات PDF جديدة</h2>
        <FileUploaderWidget onFilesSelected={handleFilesSelected} />

        {rawFiles.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs text-text-muted">حدّد قسم وعنوان كل ملف قبل النشر:</p>
            {rawFiles.map((f) => {
              const key = fileKey(f);
              const meta = fileMeta[key] ?? {};
              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
                >
                  <span className="shrink-0 text-xs text-text-muted">{f.name}</span>
                  <input
                    value={meta.title ?? ""}
                    onChange={(e) => updateFileMeta(key, { title: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-text"
                    placeholder="عنوان المحاضرة"
                  />
                  <select
                    value={meta.section ?? "theory"}
                    onChange={(e) => updateFileMeta(key, { section: e.target.value })}
                    className="rounded-md border border-border bg-bg px-2 py-1 text-text"
                  >
                    {SECTION_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {SECTION_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-text">
                    <input
                      type="checkbox"
                      checked={Boolean(meta.hidden)}
                      onChange={(e) => updateFileMeta(key, { hidden: e.target.checked })}
                    />
                    مخفي
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        {!canBuildPackage && (
          <p className="mb-3 text-xs text-danger-text">
            أكمل اسم المادة ومعرّفاً صالحاً{multiProfessor ? " ومعرّف الدكتور" : ""} قبل النشر.
          </p>
        )}
        {buildError && (
          <p className="mb-3 text-xs text-danger-text">تعذّر تجهيز حزمة النشر: {buildError}</p>
        )}
        <PublishPanel pkg={pkg} />
      </section>
    </div>
  );
}