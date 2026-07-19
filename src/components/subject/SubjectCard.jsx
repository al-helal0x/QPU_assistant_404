import React from "react";
import { Link } from "react-router-dom";

// ⚠️ ملف مملوك لعضو 2 — بطاقة عرض مادة واحدة بصفحة قائمة المواد (SubjectList.jsx).

export default function SubjectCard({ subject }) {
  return (
    <Link
      to={`/subject/${subject.id}`}
      className="block rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-accent"
    >
      <h3 className="font-bold text-text-h">{subject.name}</h3>
      {subject.code && (
        <p className="mt-1 text-xs text-text-muted">{subject.code}</p>
      )}
    </Link>
  );
}
