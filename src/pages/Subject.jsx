import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSubjectData } from "../hooks/useSubjectData.js";
import { SECTION_LABELS } from "../lib/sectionLabels.js";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed.js";
import LectureItem from "../components/subject/LectureItem.jsx";
import FileViewer from "../components/subject/FileViewer.jsx";

// ⚠️ ملف مملوك لعضو 2 — صفحة عرض مادة واحدة (أقسام نظري/عملي/... + عارض ملء الشاشة).
// يستهلك useSubjectData(id) (عضو 4) و SECTION_LABELS (جاهز) فقط — لا معرفة
// داخلية بـ professorVariants أو hidden هنا (القسم 4.6 من خطة البناء).
//
// التوزيع الجديد (عقد الأنواع): كل عنصر بمصفوفة items له type
// ("pdf" الافتراضي عند الغياب — توافق عكسي). فقط pdf/image يفتحان
// FileViewer (نملك هنا حالة "أي عنصر واحد مفتوح" كما كان). link/note لا
// علاقة لهما بـ openFile إطلاقاً — كل واحد يدير نفسه داخل LectureItem.

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
  const [openFile, setOpenFile] = useState(null); // { key, title, src, type } | null

  useEffect(() => {
    if (!loading && !notFound && subject) {
      addVisit(id);
    }
  }, [id, loading, notFound, subject, addVisit]);

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (notFound) return <div className="text-text-muted">المادة غير موجودة</div>;

  function toggleFile(item, key) {
    setOpenFile((prev) =>
      prev?.key === key
        ? null
        : {
            key,
            title: item.title,
            src: fileSrc(id, item.file),
            type: item.type || "pdf",
          }
    );
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
                    <React.Fragment key={key}>
                      <LectureItem
                        item={item}
                        isOpen={isViewerType && openFile?.key === key}
                        onToggle={isViewerType ? () => toggleFile(item, key) : undefined}
                      />
                      {isViewerType && openFile?.key === key && (
                        <FileViewer
                          src={openFile.src}
                          title={openFile.title}
                          type={openFile.type}
                          onClose={() => setOpenFile(null)}
                        />
                      )}
                    </React.Fragment>
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
