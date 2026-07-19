import React from "react";
import ThemeToggleButton from "../theme/ThemeToggleButton.jsx";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو.
// مكان زر الثيم محجوز هنا مسبقاً باستيراد ثابت — عضو 1 يبني محتوى
// ThemeToggleButton.jsx فقط، لا يحتاج يلمس هذا الملف إطلاقاً.

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-bg px-4 py-3 md:px-6">
      <div className="text-sm text-text-muted">أرشيف المحاضرات والمقررات</div>
      <ThemeToggleButton />
    </header>
  );
}
