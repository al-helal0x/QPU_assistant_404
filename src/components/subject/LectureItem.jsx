import React, { useState } from "react";

// ⚠️ ملف مملوك لعضو 2 — عنصر واحد ضمن قسم بصفحة المادة (Subject.jsx).
// يتفرّع بالعرض حسب item.type (عقد عضو 3/5 — التوزيع الجديد):
//   - pdf/image: زر توگل يبلّغ الأب عبر onToggle؛ الأب (Subject.jsx) يملك
//     حالة "أي عنصر مفتوح واحد" ويعرض FileViewer بجانبه. سلوك مطابق للسابق.
//   - link: رابط مباشر يفتح بتبويب جديد (target="_blank")، بلا أي توگل
//     ولا عارض إطلاقاً — لا علاقة له بحالة الأب.
//   - note: توگل محلي (حالة داخل هذا المكوّن نفسه فقط، الأب لا يعرف عنها)
//     يعرض item.content inline أسفل الزر مباشرة (white-space: pre-wrap)،
//     بلا عارض منفصل ولا طبقة ملء شاشة.
// عنصر بدون type بالبيانات القديمة يُعامل كـ "pdf" دائماً (توافق عكسي).

export default function LectureItem({ item, isOpen, onToggle }) {
  const type = item.type || "pdf";
  const [noteOpen, setNoteOpen] = useState(false);

  if (type === "link") {
    return (
      <li>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-between rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-text transition-colors hover:bg-bg-elevated"
        >
          <span>{item.title}</span>
          <span className="text-text-muted">↗</span>
        </a>
      </li>
    );
  }

  if (type === "note") {
    return (
      <li>
        <button
          type="button"
          onClick={() => setNoteOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
            noteOpen
              ? "border-accent bg-bg-elevated text-text-h"
              : "border-border bg-bg-subtle text-text hover:bg-bg-elevated"
          }`}
        >
          <span>{item.title}</span>
          <span className="text-text-muted">{noteOpen ? "▲" : "▼"}</span>
        </button>
        {noteOpen && (
          <div
            className="mt-2 rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-text"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {item.content}
          </div>
        )}
      </li>
    );
  }

  // pdf / image (والحالة الافتراضية بدون type)
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
