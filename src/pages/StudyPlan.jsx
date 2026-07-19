import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isVisible } from "../lib/hiddenFilter.js";

// ⚠️ ملف مملوك لعضو 2 — صفحة الخطة الدراسية.
// نفس مصدر بيانات SubjectList.jsx (public/data/study-plan.json)، لكن معروضة
// كخطة/قائمة مرتّبة بدل بطاقات + بحث.

export default function StudyPlan() {
  const [courses, setCourses] = useState([]);
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

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (error) return <div className="text-danger-text">تعذّر تحميل الخطة الدراسية</div>;

  const visible = courses.filter(isVisible);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-text-h">الخطة الدراسية</h1>

      {visible.length === 0 ? (
        <p className="text-text-muted">لا توجد مواد بالخطة حالياً</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-bg-subtle">
          {visible.map((course) => (
            <li key={course.id}>
              <Link
                to={`/subject/${course.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm text-text hover:bg-bg-elevated"
              >
                <span>{course.name}</span>
                {course.code && (
                  <span className="text-xs text-text-muted">{course.code}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
