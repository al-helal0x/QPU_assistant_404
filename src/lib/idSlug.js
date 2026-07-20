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
