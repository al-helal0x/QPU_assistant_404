import React from "react";
import ThemeToggleButton from "../theme/ThemeToggleButton.jsx";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو.
// مكان زر الثيم محجوز هنا مسبقاً باستيراد ثابت — عضو 1 يبني محتوى
// ThemeToggleButton.jsx فقط، لا يحتاج يلمس هذا الملف إطلاقاً.
//
// ⚠️ تحديث إداري: زر هامبرجر (☰) لفتح الشريط الجانبي كقائمة منسدلة على
// الجوال فقط (md:hidden) — الحالة تُدار بـ App.jsx وتُمرَّر onMenuClick هنا.

export default function Header({ onMenuClick }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-bg px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="text-xl text-text-h md:hidden"
          aria-label="فتح القائمة"
        >
          ☰
        </button>
        <div className="text-sm text-text-muted">أرشيف المحاضرات والمقررات</div>
      </div>
      <ThemeToggleButton />
    </header>
  );
}
