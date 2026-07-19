import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useSubjectData } from "../hooks/useSubjectData.js";
import { SECTION_LABELS } from "../lib/sectionLabels.js";
import LectureItem from "../components/subject/LectureItem.jsx";
import FileViewer from "../components/subject/FileViewer.jsx";

// ⚠️ ملف مملوك لعضو 2 — صفحة عرض مادة واحدة (أقسام نظري/عملي/... + عارض iframe).
// يستهلك useSubjectData(id) (عضو 4) و SECTION_LABELS (جاهز) فقط — لا معرفة
// داخلية بـ professorVariants أو hidden هنا (القسم 4.6 من خطة البناء).

// مسار ملفات PDF المنشورة (اتفاق عضو 5 - القسم 5): public/pdf/{slug}/...
function fileSrc(subjectId, filename) {
  return `${import.meta.env.BASE_URL}pdf/${subjectId}/${filename}`;
}

export default function Subject() {
  const { id } = useParams();
  const { subject, activeProfessor, lectures, loading, notFound } = useSubjectData(id);
  const [openFile, setOpenFile] = useState(null); // { key, title, src } | null

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (notFound) return <div className="text-text-muted">المادة غير موجودة</div>;

  function toggleFile(item) {
    setOpenFile((prev) =>
      prev?.key === item.file
        ? null
        : { key: item.file, title: item.title, src: fileSrc(id, item.file) }
    );
  }

  const sections = lectures?.sections || [];

  return (
    <div>
      <h1 className="text-xl font-bold text-text-h">{subject.name}</h1>
      {subject.code && <p className="text-xs text-text-muted">{subject.code}</p>}
      {activeProfessor && (
        <p className="mt-1 text-sm text-text-muted">
          الدكتور: {activeProfessor.professorName}
        </p>
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
                {section.items.map((item) => (
                  <React.Fragment key={item.file}>
                    <LectureItem
                      item={item}
                      isOpen={openFile?.key === item.file}
                      onToggle={() => toggleFile(item)}
                    />
                    {openFile?.key === item.file && (
                      <FileViewer
                        src={openFile.src}
                        title={openFile.title}
                        onClose={() => setOpenFile(null)}
                      />
                    )}
                  </React.Fragment>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
