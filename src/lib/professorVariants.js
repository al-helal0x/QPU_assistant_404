// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — القسم 4.3
// انتقل شبه جاهز من المشروع الأول (professorVariants.js) — أعد استخدام نفس
// المنطق مع تكييفه على عقد useSubjectData الجديد.

export function hasProfessorVariants(subject) {
  return Array.isArray(subject?.professorVariants) && subject.professorVariants.length > 0;
}

export function getActiveVariant(subject) {
  if (!hasProfessorVariants(subject)) return null;
  return (
    subject.professorVariants.find((v) => v.active) ||
    subject.professorVariants[0]
  );
}

/**
 * ⚠️ جديد 2026-07-22 (ميزة دكتور نظري/عملي منفصلين): يرجع كل الدكاترة
 * النشِطين حالياً لهذه المادة — قد يكون أكثر من واحد إن استُخدِم حقل
 * `role` ("theory"|"lab") على متغيّرات professorVariants. المادة العامة
 * (بلا role إطلاقاً على أي متغيّر) تبقى بسلوكها القديم تماماً: دكتور
 * واحد نشِط بحد أقصى (توافق عكسي كامل، بلا أي تغيير بالنتيجة لأي مادة
 * لا تستخدم الميزة الجديدة).
 *
 * لو المادة تستخدم role: يرجع دكتور "theory" النشِط (إن وُجد) و"lab"
 * النشِط (إن وُجد) معاً — قد يكونا الاثنين، أو واحداً فقط لو لم يُضَف
 * الآخر بعد. لو لم يوجد أي دكتور نشِط بأي دور رغم استخدام الميزة (حالة
 * نادرة/بيانات ناقصة)، يرجع مصفوفة فارغة بدل الرجوع لأول عنصر (لتفادي
 * عرض دكتور بدور خاطئ بالغلط).
 */
export function getActiveVariants(subject) {
  if (!hasProfessorVariants(subject)) return [];
  const variants = subject.professorVariants;
  const usesRoles = variants.some((v) => v.role === "theory" || v.role === "lab");

  if (!usesRoles) {
    const single = getActiveVariant(subject);
    return single ? [single] : [];
  }

  const theory = variants.find((v) => v.role === "theory" && v.active);
  const lab = variants.find((v) => v.role === "lab" && v.active);
  return [theory, lab].filter(Boolean);
}

export function getAllVariants(subject) {
  return hasProfessorVariants(subject) ? subject.professorVariants : [];
}

export function resolveLecturesFile(subject) {
  const active = getActiveVariant(subject);
  return active?.lecturesFile || "lectures.json";
}

/**
 * ⚠️ جديد 2026-07-22: يدمج محتوى ملفي محاضرات (نظري/عملي) بملف واحد معروض
 * للطالب، حين تكون المادة مفعِّلة لدكتورين منفصلين بنفس الوقت (getActiveVariants
 * أعلاه أرجعت اثنين). كل قسم "theory" يُؤخَذ حصراً من ملف الدكتور صاحب
 * role="theory" (تجاهل أي قسم theory بملف دكتور "lab" لو وُجِد بالغلط،
 * والعكس)، بينما "extra"/"exam" (لا علاقة لها بنظري/عملي) تُدمَج من كلا
 * الملفين معاً (تسلسل العناصر، الملف الأول بترتيب entries ثم الثاني).
 *
 * entries: Array<{ role: "theory"|"lab", sections: Array<{section, hidden, items}> }>
 * → { sections: [...] } بنفس شكل ملف lectures.json عادي، جاهز لـ Subject.jsx
 * بلا أي تغيير بمنطق العرض هناك.
 */
export function mergeLecturesByRole(entries) {
  const bySection = new Map(); // section key -> { section, hidden, items }

  function appendItems(sectionKey, sectionData) {
    if (!sectionData) return;
    const existing = bySection.get(sectionKey);
    if (existing) {
      existing.items = [...existing.items, ...(sectionData.items || [])];
      // لو أي من الملفين يُظهِر القسم، القسم يظهر (hidden=false يغلب)
      existing.hidden = existing.hidden && Boolean(sectionData.hidden);
    } else {
      bySection.set(sectionKey, {
        section: sectionKey,
        hidden: Boolean(sectionData.hidden),
        items: [...(sectionData.items || [])],
      });
    }
  }

  for (const entry of entries) {
    const sections = entry?.sections || [];
    for (const s of sections) {
      // القسم المطابق للدور (role="theory" ↔ section="theory") يُؤخَذ كاملاً
      // كما هو من صاحبه فقط؛ القسم المخالف للدور (مثلاً section="lab" بملف
      // دكتور theory) يُتجاهَل تماماً — لا يُفترَض أن يوجد أصلاً، لكن هذا
      // خط دفاع لو أُدخِلت بيانات غير متسقة يدوياً.
      if (s.section === "theory" && entry.role !== "theory") continue;
      if (s.section === "lab" && entry.role !== "lab") continue;
      appendItems(s.section, s);
    }
  }

  return { sections: Array.from(bySection.values()) };
}
