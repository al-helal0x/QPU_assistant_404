import React from "react";

// ⚠️ ملف مملوك لعضو 2 — عارض ملفات PDF داخل الصفحة (iframe).
// يُستهلك من داخل Subject.jsx فقط، أسفل عنصر المحاضرة المفتوح حالياً.

export default function FileViewer({ src, title, onClose }) {
  if (!src) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border bg-bg-subtle">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="truncate text-sm text-text-h">{title}</span>
        <div className="flex items-center gap-3 text-xs shrink-0">
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
      <iframe src={src} title={title} className="h-[70vh] w-full bg-bg" />
    </div>
  );
}
