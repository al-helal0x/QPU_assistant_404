import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SubjectForm from "../../components/admin/SubjectForm.jsx";

// ⚠️ ملف مملوك لعضو 3 — محرر المادة (إضافة/تعديل).
// يجلب subject.json + كل ملفات lectures*.json المرتبطة به مباشرة (بدون
// useSubjectData الخاص بعضو 4، لأن ذاك الـ hook يستبعد العناصر المخفية
// عن قصد للطلاب — لوحة التحكم بالعكس يجب أن تُظهر كل شيء بما فيه المخفي).

async function fetchExistingIds() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/study-plan.json`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.courses ?? []).map((c) => c.id);
}

async function fetchSubject(id) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/subjects/${id}/subject.json`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchLecturesFile(id, filename) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/subjects/${id}/${filename}`);
  if (!res.ok) return { sections: [] };
  return res.json();
}

/** يبني { [professorId|"_default"]: { sections } } حسب عقد subject.json (القسم 4.3)
 * — نفس الشكل الذي يتوقعه SubjectForm (initialLecturesByVariant). */
async function fetchAllLectures(id, subject) {
  if (subject?.professorVariants?.length) {
    const entries = await Promise.all(
      subject.professorVariants.map(async (v) => {
        const data = await fetchLecturesFile(id, v.lecturesFile || "lectures.json");
        return [v.professorId, data];
      })
    );
    return Object.fromEntries(entries);
  }
  const data = await fetchLecturesFile(id, "lectures.json");
  return { _default: data };
}

export default function AdminSubjectEditor() {
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [notFound, setNotFound] = useState(false);
  const [subject, setSubject] = useState(null);
  const [lecturesByVariant, setLecturesByVariant] = useState({});
  const [existingIds, setExistingIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const ids = await fetchExistingIds();
      if (!isEditing) {
        if (!cancelled) {
          setExistingIds(ids);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const subj = await fetchSubject(id);
      if (!subj) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      const lectures = await fetchAllLectures(id, subj);
      if (!cancelled) {
        setExistingIds(ids);
        setSubject(subj);
        setLecturesByVariant(lectures);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (isEditing && notFound) {
    return <div className="text-danger-text">المادة "{id}" غير موجودة.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text-h">
        {isEditing ? `تعديل: ${subject?.name ?? id}` : "إضافة مادة جديدة"}
      </h1>
      <SubjectForm
        initialSubject={subject}
        initialLecturesByVariant={lecturesByVariant}
        existingIds={existingIds}
      />
    </div>
  );
}
