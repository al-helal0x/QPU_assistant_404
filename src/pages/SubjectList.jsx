import React, { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useStudyPlan } from "../hooks/useStudyPlan.js";
import SubjectCard from "../components/subject/SubjectCard.jsx";

// ⚠️ ملف مملوك لعضو 2 — قائمة المواد + بحث Fuse.js.
// الدفعة 4: يستهلك useStudyPlan() (عضو 4) بدل fetch مباشر لـ study-plan.json —
// يحل ازدواجية الجلب بين هذا الملف وStudyPlan.jsx، ويضمن مسار fetch صحيح
// تحت أي base (مسؤولية عضو 4 داخل الـ hook).

export default function SubjectList() {
  const { courses, loading } = useStudyPlan();
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () => new Fuse(courses, { keys: ["name", "code"], threshold: 0.35 }),
    [courses]
  );

  const results = query.trim() ? fuse.search(query).map((r) => r.item) : courses;

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-text-h">المواد الدراسية</h1>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن مادة بالاسم أو الرمز..."
        className="mb-6 w-full max-w-sm rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
      />

      {results.length === 0 ? (
        <p className="text-text-muted">لا توجد نتائج مطابقة</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((course) => (
            <SubjectCard key={course.id} subject={course} />
          ))}
        </div>
      )}
    </div>
  );
}
