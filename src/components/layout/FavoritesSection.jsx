import React from "react";
import { Link } from "react-router-dom";
import { useStudyPlan } from "../../hooks/useStudyPlan.js";
import { useFavorites } from "../../hooks/useFavorites.js";

// ⚠️ ملف مملوك لعضو 2 — الدفعة 4 (المهمة 4)
// قسم "المفضلة" بالشريط الجانبي. المدير يستورده يدوياً بـ Sidebar.jsx
// (بنفس نمط حجز مكان ThemeToggleButton بـ Header.jsx) — لا يلمس عضو 2 ذلك الملف.
// لو ما فيه مواد مفضّلة، لا يُعرض القسم إطلاقاً.

export default function FavoritesSection() {
  const { courses, loading } = useStudyPlan();
  const { favorites } = useFavorites();

  if (loading) return null;

  const items = courses.filter((c) => favorites.includes(c.id));
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 px-1 text-xs font-bold text-text-muted">⭐ المفضلة</div>
      <nav className="flex flex-col gap-1">
        {items.map((course) => (
          <Link
            key={course.id}
            to={`/subject/${course.id}`}
            className="truncate rounded-md px-3 py-1.5 text-sm text-text hover:bg-bg-elevated"
          >
            {course.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
