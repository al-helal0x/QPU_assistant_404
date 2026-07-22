import { useEffect, useState } from "react";
import { getActiveVariant, getActiveVariants, mergeLecturesByRole } from "../lib/professorVariants.js";
import { isVisible, filterVisibleSections } from "../lib/hiddenFilter.js";

// ⚠️ ملف مملوك لعضو 4 — القسم 4.6
// هذا هو العقد الذي يستهلكه عضو 2 (صفحات الطالب).
// ⚠️ تحديث 2026-07-22 (ميزة دكتور نظري/عملي): أُضيف حقل activeProfessors
// (مصفوفة، 0-2 عنصر) بجانب activeProfessor القديم (لا يزال يُرجَّع كما
// كان = أول عنصر بـ activeProfessors، غالباً الدكتور العام أو دكتور
// النظري) — أي كود قديم يستهلك activeProfessor فقط يستمر يعمل بلا أي
// تغيير. المواد التي لا تستخدم الميزة الجديدة (بلا role على أي متغيّر)
// غير متأثرة إطلاقاً بهذا التحديث — نفس نتيجة تماماً كالسابق.

export function useSubjectData(id) {
  const [state, setState] = useState({
    subject: null,
    activeProfessor: null,
    activeProfessors: [],
    lectures: null,
    loading: true,
    notFound: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState((s) => ({ ...s, loading: true, notFound: false }));
      try {
        const subjectRes = await fetch(`${import.meta.env.BASE_URL}data/subjects/${id}/subject.json`);
        if (!subjectRes.ok) throw new Error("not-found");
        const subject = await subjectRes.json();

        if (!isVisible(subject)) throw new Error("not-found");

        const activeProfessors = getActiveVariants(subject);
        const activeProfessor = getActiveVariant(subject);

        let lectures = null;
        if (activeProfessors.length <= 1) {
          // مادة عادية (دكتور واحد أو بلا دكاترة) — نفس المسار القديم تماماً.
          const lecturesFile = activeProfessors[0]?.lecturesFile || "lectures.json";
          const lecturesRes = await fetch(
            `${import.meta.env.BASE_URL}data/subjects/${id}/${lecturesFile}`
          );
          const rawLectures = lecturesRes.ok ? await lecturesRes.json() : null;
          lectures = rawLectures ? filterVisibleSections(rawLectures) : null;
        } else {
          // دكتور نظري + دكتور عملي معاً — جلب الملفين ودمجهما.
          const entries = await Promise.all(
            activeProfessors.map(async (v) => {
              const res = await fetch(
                `${import.meta.env.BASE_URL}data/subjects/${id}/${v.lecturesFile}`
              );
              const raw = res.ok ? await res.json() : null;
              return { role: v.role, sections: raw ? filterVisibleSections(raw)?.sections : [] };
            })
          );
          lectures = mergeLecturesByRole(entries);
        }

        if (!cancelled) {
          setState({ subject, activeProfessor, activeProfessors, lectures, loading: false, notFound: false });
        }
      } catch {
        if (!cancelled) {
          setState({
            subject: null,
            activeProfessor: null,
            activeProfessors: [],
            lectures: null,
            loading: false,
            notFound: true,
          });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
