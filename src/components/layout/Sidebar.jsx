import React from "react";
import { NavLink } from "react-router-dom";
import FavoritesSection from "./FavoritesSection.jsx";
import RecentlyViewedSection from "./RecentlyViewedSection.jsx";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو.
//
// ⚠️ تحديث إداري (خطة الدفعة 4، المهمة 1): حُذف رابط "لوحة التحكم" نهائياً —
// الوصول لـ /admin الآن فقط لمن يعرف الرابط المباشر ويملك توكن صالح
// (AdminAuthGate بـ App.jsx). لا تُعده لاحقاً بدون قرار إداري صريح.
//
// ⚠️ تحديث إداري (خطة الدفعة 4، المهمة 4، أكمله عضو 6 لأن التسليم كان جزئياً):
// FavoritesSection/RecentlyViewedSection (عضو 2) موصولتان الآن. كل قسم يخفي
// نفسه بالكامل لو فاضياً (منطق ذلك بملفي المكوّنين أنفسهما، لا شيء هنا).

const NAV_ITEMS = [
  { to: "/", label: "المواد", end: true },
  { to: "/study-plan", label: "الخطة الدراسية" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-l border-border bg-bg-subtle p-4 hidden md:block">
      <div className="text-lg font-bold text-text-h mb-6">assistant404</div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "text-text hover:bg-bg-elevated"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <FavoritesSection />
      <RecentlyViewedSection />
    </aside>
  );
}
