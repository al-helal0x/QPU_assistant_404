import React from "react";
import { Link } from "react-router-dom";
import { useStudyPlan } from "../hooks/useStudyPlan.js";

// ⚠️ ملف مملوك لعضو 2 — صفحة الخطة الدراسية.
// الدفعة 4: يستهلك useStudyPlan() (عضو 4) بدل fetch مباشر — نفس مصدر
// SubjectList.jsx الآن، بلا ازدواجية.

export default function StudyPlan() {
  const { courses, loading } = useStudyPlan();

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-text-h">الخطة الدراسية</h1>

      {courses.length === 0 ? (
        <p className="text-text-muted">لا توجد مواد بالخطة حالياً</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-bg-subtle">
          {courses.map((course) => (
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
