import React, { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { isVisible } from "../lib/hiddenFilter.js";
import SubjectCard from "../components/subject/SubjectCard.jsx";

// ⚠️ ملف مملوك لعضو 2 — قائمة المواد + بحث Fuse.js + فلترة hidden.
// مصدر القائمة: public/data/study-plan.json (نفس بيانات البذرة المستخدمة
// بصفحة الخطة الدراسية) — لا يوجد endpoint منفصل لقائمة المواد بالعقود الحالية.

export default function SubjectList() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/study-plan.json`);
        if (!res.ok) throw new Error("fetch-failed");
        const data = await res.json();
        if (!cancelled) {
          setCourses(Array.isArray(data?.courses) ? data.courses : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCourses = useMemo(() => courses.filter(isVisible), [courses]);

  const fuse = useMemo(
    () => new Fuse(visibleCourses, { keys: ["name", "code"], threshold: 0.35 }),
    [visibleCourses]
  );

  const results = query.trim() ? fuse.search(query).map((r) => r.item) : visibleCourses;

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (error) return <div className="text-danger-text">تعذّر تحميل قائمة المواد</div>;

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
