import React, { useEffect } from "react";

// ⚠️ ملف مملوك لعضو 2 — الدفعة 4 (المهمة 3)
// عارض ملف الآن طبقة تغطي الشاشة كاملة (بدل عنصر مضمّن بالتخطيط)، بنفس
// حالة activeFile الموجودة أصلاً بـ Subject.jsx. زر "تنزيل" و"فتح بتبويب جديد"
// موجودان كما كانا، بالإضافة لزر إغلاق واضح وإغلاق بمفتاح Escape.

export default function FileViewer({ src, title, onClose }) {
  useEffect(() => {
    if (!src) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="truncate text-sm font-bold text-text-h">{title}</span>
        <div className="flex shrink-0 items-center gap-4 text-sm">
          <a href={src} download className="text-accent hover:text-accent-hover">
            تنزيل
          </a>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:text-accent-hover"
          >
            فتح بتبويب جديد
          </a>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text"
            >
              إغلاق ✕
            </button>
          )}
        </div>
      </div>
      <iframe src={src} title={title} className="w-full flex-1 bg-bg" />
    </div>
  );
}
