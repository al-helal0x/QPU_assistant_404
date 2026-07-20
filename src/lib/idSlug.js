// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — القسم 4.7

// خريطة تحويل الحروف العربية إلى ما يقابلها لاتينياً (تقريبية، تكفي كنقطة
// بداية يعدّلها المدير يدوياً بالحقل قبل الحفظ — هذا مقصود بالعقد §4.7).
const ARABIC_TRANSLITERATION_MAP = {
  ا: "a", أ: "a", إ: "i", آ: "aa", ء: "",
  ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh",
  د: "d", ذ: "th", ر: "r", ز: "z", س: "s", ش: "sh",
  ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh",
  ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n",
  ه: "h", و: "w", ي: "y", ى: "a", ة: "a",
  ئ: "e", ؤ: "o",
  // تشكيل — يُحذف
  "َ": "", "ً": "", "ُ": "", "ٌ": "", "ِ": "", "ٍ": "", "ّ": "", "ْ": "",
};

function transliterate(text) {
  return Array.from(text)
    .map((ch) => (ch in ARABIC_TRANSLITERATION_MAP ? ARABIC_TRANSLITERATION_MAP[ch] : ch))
    .join("");
}

/**
 * يحوّل اسم عربي/عام إلى slug إنجليزي بسيط قابل للتعديل يدوياً بعدها.
 * ليس تحويلاً حرفياً دقيقاً — الغرض نقطة بداية معقولة يراجعها المدير بحقل
 * قابل للتعديل قبل الحفظ (كما ينص العقد §4.7)، وهذا هو ما يستهلكه
 * buildSubjectPackage() (عضو 5) عبر SubjectForm.jsx (عضو 3) لاحقاً.
 */
export function suggestSlug(name) {
  if (!name) return "";
  return transliterate(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** يتحقق أن slug صالح (lowercase, أرقام, شرطات فقط) وغير مكرر ضمن قائمة معرّفات موجودة */
export function isValidSlug(slug, existingIds = []) {
  const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return pattern.test(slug) && !existingIds.includes(slug);
}

/**
 * يتحقق من سلامة قائمة مواد study-plan.json كاملة (لا سطر واحد فقط) قبل النشر:
 * الشكل الصحيح لكل عنصر (id/name)، صحة صيغة كل id، وعدم تكرار أي id ضمن
 * القائمة نفسها. مخصَّص كخط دفاع أخير قبل استدعاء buildStudyPlanUpdate
 * (عضو 5)، بمعزل عن التحقق التفاعلي لسطر واحد بـ isValidSlug عند الإضافة
 * (المستخدَم فعلياً بـ StudyPlanEditor.jsx، عضو 3) — الاثنان يتكاملان: isValidSlug
 * لسطر جديد وهو يُكتَب، وvalidateStudyPlan للقائمة كاملة قبل إرسالها للنشر
 * (يلتقط مثلاً تكرار id ناتج عن دمج/استيراد لا عن الإضافة اليدوية بالواجهة).
 *
 * ترجع { valid: boolean, errors: string[] } — errors فارغة يعني صالح تماماً.
 */
export function validateStudyPlan(courses) {
  if (!Array.isArray(courses)) {
    return { valid: false, errors: ["study-plan.json يجب أن يحتوي حقل courses كمصفوفة"] };
  }

  const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const seenIds = new Set();
  const errors = [];

  courses.forEach((course, index) => {
    const label = `العنصر رقم ${index + 1}`;

    if (!course || typeof course !== "object") {
      errors.push(`${label}: ليس كائناً صالحاً`);
      return;
    }

    if (typeof course.id !== "string" || !idPattern.test(course.id)) {
      errors.push(`${label}: id غير صالح ("${course.id ?? ""}")`);
    } else if (seenIds.has(course.id)) {
      errors.push(`${label}: id مكرر ("${course.id}")`);
    } else {
      seenIds.add(course.id);
    }

    if (typeof course.name !== "string" || !course.name.trim()) {
      errors.push(`${label}: اسم المادة مفقود`);
    }
  });

  return { valid: errors.length === 0, errors };
}
