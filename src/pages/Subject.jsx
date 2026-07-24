import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSubjectData } from "../hooks/useSubjectData.js";
import { SECTION_LABELS } from "../lib/sectionLabels.js";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed.js";
import LectureItem from "../components/subject/LectureItem.jsx";

// ⚠️ ملف مملوك لعضو 2 — صفحة عرض مادة واحدة (أقسام نظري/عملي/... إلخ).
// يستهلك useSubjectData(id) (عضو 4) و SECTION_LABELS (جاهز) فقط — لا معرفة
// داخلية بـ professorVariants أو hidden هنا (القسم 4.6 من خطة البناء).
//
// التوزيع الجديد (عقد الأنواع): كل عنصر بمصفوفة items له type
// ("pdf" الافتراضي عند الغياب — توافق عكسي). فقط pdf/image يتحكمان بحالة
// "أي عنصر واحد مفتوح" هنا (openKey) — لكن العرض الفعلي (قائمة تنزيل/فتح
// بتبويب جديد) صار مسؤولية LectureItem نفسه الآن (2026-07-24: أزلنا
// FileViewer كامل الشاشة، كان يوهم مستخدم الهاتف أن الملف = أول صفحة فقط.
// راجع docs/logs/member-2-log.md). link/note لا علاقة لهما بـ openKey
// إطلاقاً — كل واحد يدير نفسه داخل LectureItem.

// مسار ملفات pdf/image المنشورة (اتفاق عضو 5): public/pdf/{slug}/...
// مبني على import.meta.env.BASE_URL عشان يشتغل صح تحت مسار فرعي بـ GitHub Pages.
function fileSrc(subjectId, filename) {
  return `${import.meta.env.BASE_URL}pdf/${subjectId}/${filename}`;
}

// مفتاح فريد للعنصر: البيانات الحالية ما فيها id صريح، فنعتمد على الحقل
// المميز حسب النوع (file لـ pdf/image، url لـ link)، وفولباك بالفهرس لـ note
// أو أي عنصر ناقص.
function itemKey(item, idx) {
  return item.file || item.url || `${item.type || "pdf"}-${item.title}-${idx}`;
}

export default function Subject() {
  const { id } = useParams();
  const { subject, activeProfessor, lectures, loading, notFound } = useSubjectData(id);
  const { addVisit } = useRecentlyViewed();
  // مفتاح العنصر المفتوح حالياً فقط (أو null) — لا نخزّن src/title/type هنا
  // بعد الآن، LectureItem يبنيها بنفسه من item + src الممرَّر له.
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    if (!loading && !notFound && subject) {
      addVisit(id);
    }
  }, [id, loading, notFound, subject, addVisit]);

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (notFound) return <div className="text-text-muted">المادة غير موجودة</div>;

  // فتح عنصر ثانٍ يغلق الأول تلقائياً (نفس مفتاح حالة واحد لكل الصفحة).
  function toggleFile(key) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  const sections = lectures?.sections || [];

  return (
    <div>
      <h1 className="text-xl font-bold text-text-h">{subject.name}</h1>
      {subject.code && <p className="text-xs text-text-muted">{subject.code}</p>}
      {subject.sectionProfessors?.theory || subject.sectionProfessors?.lab ? (
        <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-text-muted">
          {subject.sectionProfessors.theory && <span>نظري: {subject.sectionProfessors.theory}</span>}
          {subject.sectionProfessors.lab && <span>عملي: {subject.sectionProfessors.lab}</span>}
        </div>
      ) : (
        activeProfessor && (
          <p className="mt-1 text-sm text-text-muted">
            الدكتور: {activeProfessor.professorName}
          </p>
        )
      )}

      <div className="mt-6 space-y-6">
        {sections.length === 0 && (
          <p className="text-text-muted">لا توجد محتويات متاحة بعد لهذه المادة</p>
        )}

        {sections.map((section) => (
          <div key={section.section}>
            <h2 className="mb-2 text-sm font-bold text-text-h">
              {SECTION_LABELS[section.section] || section.section}
            </h2>

            {section.items.length === 0 ? (
              <p className="text-xs text-text-muted">لا توجد ملفات بهذا القسم بعد</p>
            ) : (
              <ul className="space-y-2">
                {section.items.map((item, idx) => {
                  const type = item.type || "pdf";
                  const key = itemKey(item, idx);
                  const isViewerType = type === "pdf" || type === "image";

                  return (
                    <LectureItem
                      key={key}
                      item={item}
                      isOpen={isViewerType && openKey === key}
                      onToggle={isViewerType ? () => toggleFile(key) : undefined}
                      src={isViewerType ? fileSrc(id, item.file) : undefined}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
