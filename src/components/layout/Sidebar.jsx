import React from "react";
import { NavLink } from "react-router-dom";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو.
// كل الروابط ثابتة ومعروفة سلفاً، فلا حاجة لأي عضو (مثل عضو لوحة التحكم)
// أن يضيف رابطه هنا بنفسه لاحقاً — الرابط موجود من اليوم الأول.

const NAV_ITEMS = [
  { to: "/", label: "المواد", end: true },
  { to: "/study-plan", label: "الخطة الدراسية" },
  { to: "/admin", label: "🛠 لوحة التحكم" },
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
    </aside>
  );
}
