import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import SubjectForm from "../../components/admin/SubjectForm.jsx";
import CurriculumCoursePicker from "../../components/admin/CurriculumCoursePicker.jsx";
import { findCurriculumCourse } from "../../lib/curriculum.js";

// ⚠️ ملف مملوك لعضو 3 — محرر المادة (إضافة/تعديل).
// يجلب subject.json + كل ملفات lectures*.json المرتبطة به مباشرة (بدون
// useSubjectData الخاص بعضو 4، لأن ذاك الـ hook يستبعد العناصر المخفية
// عن قصد للطلاب — لوحة التحكم بالعكس يجب أن تُظهر كل شيء بما فيه المخفي).
//
// ⚠️ تحديث: عند إضافة مادة جديدة (لا id بالرابط)، تُعرض أولاً قائمة اختيار
// من الخطة الدراسية الرسمية (curriculum.json عبر CurriculumCoursePicker) بدل
// نموذج فاضٍ مباشرة. رابط `?course=<id>` (مثلاً من زر بصفحة StudyPlan) يختار
// المادة تلقائياً بلا حاجة للبحث اليدوي. "تجاهل" يرجع لنموذج فاضٍ كالسابق.
//
// ⚠️ إصلاح (تقرير عضو 6: "المواد المضافة لا تظهر بصفحة المواد" — تكرّر رغم
// الإصلاح السابق بـ buildSubjectPackage): تحقّقت من الريبو المنشور فعلياً ووجدت
// مادة منشورة ("1110501") غائبة كلياً عن study-plan.json — السبب: `studyPlan`
// هنا هو "الأساس" الذي يُبنى عليه study-plan.json الجديد كاملاً عبر
// buildSubjectPackage (`existingStudyPlan`). لو كانت النسخة المجلوبة هنا مخزَّنة
// مؤقتاً (كاش المتصفح أو GitHub Pages/CDN) وتفوتها إضافة سابقة، فأي نشر لاحق
// يكتب الملف بالكامل بناءً عليها ويفقد تلك الإضافة نهائياً. نفس الشيء ينطبق
// على subject.json/lectures*.json (existingSubject/existingLectures) — نسخة
// قديمة هنا تعني فقدان تعديلات سابقة (دكاترة/محاضرات) عند أي نشر لاحق. لذلك
// كل قراءات هذا الملف الآن `cache: "no-store"` + معامل كسر كاش بالرابط.

function noStoreUrl(path) {
  return `${import.meta.env.BASE_URL}${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`;
}

async function fetchStudyPlan() {
  const res = await fetch(noStoreUrl("data/study-plan.json"), { cache: "no-store" });
  if (!res.ok) return { courses: [] };
  return res.json();
}

async function fetchSubject(id) {
  const res = await fetch(noStoreUrl(`data/subjects/${id}/subject.json`), { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function fetchLecturesFile(id, filename) {
  const res = await fetch(noStoreUrl(`data/subjects/${id}/${filename}`), { cache: "no-store" });
  if (!res.ok) return { sections: [] };
  return res.json();
}

/** يبني { [professorId|"_default"]: { sections } } حسب عقد subject.json (القسم 4.3)
 * — نفس الشكل الذي يتوقعه SubjectForm (initialLecturesByVariant). */
async function fetchAllLectures(id, subject) {
  if (subject?.professorVariants?.length) {
    const entries = await Promise.all(
      subject.professorVariants.map(async (v) => {
        const data = await fetchLecturesFile(id, v.lecturesFile || "lectures.json");
        return [v.professorId, data];
      })
    );
    return Object.fromEntries(entries);
  }
  const data = await fetchLecturesFile(id, "lectures.json");
  return { _default: data };
}

export default function AdminSubjectEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [notFound, setNotFound] = useState(false);
  const [subject, setSubject] = useState(null);
  const [lecturesByVariant, setLecturesByVariant] = useState({});
  const [studyPlan, setStudyPlan] = useState({ courses: [] });
  const existingIds = studyPlan.courses.map((c) => c.id);

  // undefined = لسا ما اختار (اعرض القائمة) | null = اختار "يدوياً" | object = مادة من الخطة
  const [pickedCourse, setPickedCourse] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const plan = await fetchStudyPlan();
      const ids = plan.courses.map((c) => c.id);
      if (!isEditing) {
        if (!cancelled) {
          setStudyPlan(plan);
          setLoading(false);
        }
        const preselectId = searchParams.get("course");
        if (preselectId && !ids.includes(preselectId)) {
          const course = await findCurriculumCourse(preselectId);
          if (!cancelled && course) setPickedCourse(course);
        }
        return;
      }
      setLoading(true);
      const subj = await fetchSubject(id);
      if (!subj) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      const lectures = await fetchAllLectures(id, subj);
      if (!cancelled) {
        setStudyPlan(plan);
        setSubject(subj);
        setLecturesByVariant(lectures);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEditing, searchParams]);

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (isEditing && notFound) {
    return <div className="text-danger-text">المادة "{id}" غير موجودة.</div>;
  }

  const showPicker = !isEditing && pickedCourse === undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text-h">
        {isEditing ? `تعديل: ${subject?.name ?? id}` : "إضافة مادة جديدة"}
      </h1>

      {showPicker ? (
        <CurriculumCoursePicker existingIds={existingIds} onPick={setPickedCourse} />
      ) : (
        <SubjectForm
          key={isEditing ? id : pickedCourse?.id ?? "manual"}
          initialSubject={subject}
          initialLecturesByVariant={lecturesByVariant}
          existingIds={existingIds}
          prefill={!isEditing ? pickedCourse : null}
          existingStudyPlan={studyPlan}
        />
      )}
    </div>
  );
}