import { useEffect, useState } from "react";
import { isVisible } from "../lib/hiddenFilter.js";

// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — الدفعة 4، المهمة 4.
// عقد موحّد لاستهلاك study-plan.json، يحل ازدواجية fetch الموجودة حالياً
// بـ SubjectList.jsx و StudyPlan.jsx (كل واحد يجيب البيانات ويطبّق isVisible
// بنفسه بشكل منفصل ومكرَّر). عضو 2 يستهلك هذا الهوك مباشرة بدل التكرار.
//
// شكل القيمة المُرجَعة محسوم بخطة التعديل (الدفعة 4، المهمة 4):
// { courses, loading } — لا تُغيَّر بدون تنسيق مع المدير.
//
// عند فشل الجلب: courses ترجع مصفوفة فارغة (لا حقل error منفصل بالعقد) —
// هذا يتماشى فعلياً مع سلوك "أخفِ القسم كاملاً لو فاضي" المطلوب من
// FavoritesSection/RecentlyViewedSection (عضو 2).
export function useStudyPlan() {
  const [state, setState] = useState({ courses: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/study-plan.json`);
        if (!res.ok) throw new Error("fetch-failed");
        const data = await res.json();
        const courses = Array.isArray(data?.courses) ? data.courses.filter(isVisible) : [];
        if (!cancelled) setState({ courses, loading: false });
      } catch {
        if (!cancelled) setState({ courses: [], loading: false });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
