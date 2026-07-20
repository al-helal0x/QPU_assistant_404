import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ⚠️ ملف مملوك لعضو 3 (لوحة التحكم — الواجهة).
//
// ملاحظة مصدر البيانات (ليست بالعقود الأصلية، قرار عضو 3):
// لا يوجد "فهرس" ثابت لكل المواد بهذا المشروع، فقط public/data/study-plan.json
// و public/data/subjects/{slug}/subject.json المتفرقة. بانتظار وجود endpoint/فهرس
// مخصص، استخدمت study-plan.json كمصدر لقائمة المواد بلوحة التحكم لأنه أنسب
// مصدر موجود فعلاً من اليوم الأول (يحوي id/name/code/hidden لكل مادة).
// إن أنشأ المدير أو عضو 4 فهرساً مخصصاً لاحقاً، هذا الملف فقط من يحتاج تعديل
// نقطة الجلب أدناه (fetchSubjects) وبقية الصفحة تبقى كما هي.

async function fetchSubjects() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/study-plan.json`);
  if (!res.ok) throw new Error("تعذّر تحميل قائمة المواد");
  const data = await res.json();
  return data?.courses ?? [];
}

export default function AdminHome() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // إخفاء/حذف هنا محلي فقط بواجهة العرض؛ التطبيق الفعلي على البيانات يمر
  // عبر محرر المادة ← PublishPanel (عضو 5)، لأن الموقع Static بلا خادم.
  const [localOverrides, setLocalOverrides] = useState({});
  const [markedForDeletion, setMarkedForDeletion] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetchSubjects()
      .then((list) => {
        if (!cancelled) setSubjects(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleLocalHidden(id) {
    setLocalOverrides((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? subjects.find((s) => s.id === id)?.hidden ?? false),
    }));
  }

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (error) return <div className="text-danger-text">{error}</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-h">لوحة التحكم</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/sections"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-bg-elevated"
          >
            إدارة الأقسام
          </Link>
          <Link
            to="/admin/subject"
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover"
          >
            + إضافة مادة جديدة
          </Link>
        </div>
      </div>

      {subjects.length === 0 && (
        <p className="text-sm text-text-muted">لا توجد مواد بعد.</p>
      )}

      <ul className="flex flex-col gap-2">
        {subjects.map((s) => {
          const hiddenNow = localOverrides[s.id] ?? s.hidden;
          const marked = Boolean(markedForDeletion[s.id]);
          return (
            <li
              key={s.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 ${
                marked
                  ? "border-danger-border bg-danger-bg opacity-70"
                  : hiddenNow
                  ? "border-warning-border bg-warning-bg"
                  : "border-border bg-bg-subtle"
              }`}
            >
              <div>
                <p className="font-medium text-text-h">
                  {s.name}{" "}
                  {hiddenNow && (
                    <span className="ms-2 rounded-full bg-warning-border px-2 py-0.5 text-xs text-warning-text">
                      مخفي
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-muted">
                  {s.id} {s.code ? `· ${s.code}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/subject/${s.id}`}
                  className="rounded-md border border-border px-3 py-1 text-xs text-text hover:bg-bg-elevated"
                >
                  تعديل
                </Link>
                <button
                  type="button"
                  onClick={() => toggleLocalHidden(s.id)}
                  className="rounded-md border border-border px-3 py-1 text-xs text-text hover:bg-bg-elevated"
                >
                  {hiddenNow ? "إظهار" : "إخفاء"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMarkedForDeletion((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                  }
                  className="rounded-md border border-danger-border bg-danger-bg px-3 py-1 text-xs text-danger-text hover:opacity-80"
                >
                  {markedForDeletion[s.id] ? "إلغاء الحذف" : "حذف"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {(Object.keys(localOverrides).length > 0 || Object.values(markedForDeletion).some(Boolean)) && (
        <p className="text-xs text-text-muted">
          ⚠️ تغييرات الإخفاء/الحذف أعلاه محلية بالمتصفح فقط للمعاينة (الموقع Static
          بلا خادم) — افتح "تعديل" على كل مادة وانشر التغيير فعلياً عبر لوحة النشر
          بالأسفل ليتم حفظه.
        </p>
      )}
    </div>
  );
}
