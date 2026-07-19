import React from "react";

// ⚠️ ملف مملوك لعضو 2 — عنصر محاضرة واحد ضمن قسم بصفحة المادة (Subject.jsx).
// عنصر عرض فقط: يبلّغ الأب بالنقر عبر onToggle، ولا يملك حالة عرض PDF بنفسه
// (ذلك من مسؤولية FileViewer اللي يُعرض بجانبه من Subject.jsx).

export default function LectureItem({ item, isOpen, onToggle }) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
          isOpen
            ? "border-accent bg-bg-elevated text-text-h"
            : "border-border bg-bg-subtle text-text hover:bg-bg-elevated"
        }`}
      >
        <span>{item.title}</span>
        <span className="text-text-muted">{isOpen ? "▲" : "▼"}</span>
      </button>
    </li>
  );
}
