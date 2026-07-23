// ⚠️ ملف مملوك لعضو 5 (خط أنابيب النشر) — القسم 5 من خطة البناء
//
// عقد هذا الملف (للتوثيق فقط، ينسخه عضو 6 لاحقاً إلى docs/data-schema.md):
//
// buildSubjectPackage({ subjectMeta, items }) → pkg
//   subjectMeta: {
//     id: string,                 // slug نهائي (من lib/idSlug.js، عضو 4)
//     name: string,               // الاسم العربي
//     code: string,
//     hidden?: boolean,
//     professorId?: string,       // إن وُجد → وضع تعدد الدكاترة (القسم 4.3)
//     professorName?: string,
//     setActive?: boolean,        // هل يصبح هذا الدكتور النشِط؟ إن لم تُمرَّر صراحة:
//                                  // دكتور موجود مسبقاً يحافظ على حالة active السابقة كما هي،
//                                  // ودكتور جديد كلياً يصير active فقط لو كان الأول إطلاقاً
//     existingSubject?: object,   // subject.json الحالي (عند التعديل، لحفظ باقي الدكاترة)
//     existingLectures?: object,  // lectures*.json الحالي (عند الإضافة على مادة موجودة)
//     existingStudyPlan?: object, // public/data/study-plan.json الحالي كاملاً — لازم يُمرَّر
//                                  // بأحدث نسخة معروفة (نفس نمط existingSubject/existingLectures)
//                                  // وإلا ستُفقَد مواد أخرى غير مادة هذا النشر من courses
//   }
//   items: Array<{
//     type?: "pdf"|"image"|"link"|"note",  // غيابه = "pdf" دائماً (توافق عكسي)
//     title: string,
//     section: "theory"|"lab"|"extra"|"exam", // مفاتيح SECTION_LABELS (عضو 1/التسليم الثابت)
//     hidden?: boolean,
//     file?: File,   // pdf/image فقط — كائن File فعلي من المتصفح.
//                     // اسم الملف الفعلي يُشتق من title (بعد تنظيف الرموز غير
//                     // الصالحة) + امتداد يطابق النوع (.pdf لـ pdf، أو
//                     // .png/.jpg/.webp لـ image حسب file.type) — مع لاحقة
//                     // رقمية (_2, _3...) تلقائياً عند تكرار نفس الاسم.
//                     // صيغ image المقبولة: png/jpeg/webp فقط — لا SVG.
//     url?: string,   // link فقط — يجب أن يبدأ http:// أو https:// (يُتحقَّق
//                      // منه هنا أيضاً، إضافة لتحقق واجهة عضو 3 — كلا الطرفين معاً)
//     content?: string, // note فقط — نص خام فقط (بلا Markdown/HTML)
//   }>
//
//   → pkg: {
//     slug, subjectPath, lecturesPath, pdfDir, studyPlanPath,
//     subjectJson, lecturesJson, studyPlanJson,
//     pdfFiles: [{ path, file, name }],  // فقط لعناصر pdf/image (name = اسم الملف الفعلي)
//   }
//
// buildSubjectDeletion(slug, { existingSubject, existingStudyPlan }) → pkg
//   حذف تدميري كامل لمادة: subject.json + كل lectures*.json المرتبطة (بحسب
//   professorVariants إن وُجدت، وإلا lectures.json وحدها) + مجلد public/pdf/{slug}
//   بالكامل (يُحلَّل وقت النشر عبر listDirectory — لا نعرف أسماء ملفاته هنا مقدّماً)،
//   ويُزال سطر المادة من public/data/study-plan.json بنفس الحزمة/الـ PR.
//   → pkg: { kind: "subject-deletion", slug, filesToDelete: [...], pdfDir, studyPlanPath, studyPlanJson }
//
// buildStudyPlanUpdate(courses) → pkg
//   يكتب public/data/study-plan.json كاملاً بقائمة courses الجديدة فقط — بمعزل
//   تام عن محتوى أي مادة (subject.json/lectures*.json/pdf غير متأثرة إطلاقاً).
//   → pkg: { kind: "study-plan-update", studyPlanPath, studyPlanJson }
//
// publishToGitHub({ token, owner, repo, pkg, baseBranch?, autoMerge? }) → { prUrl, branch, merged, mergeError? }
//   autoMerge: افتراضي true — يدمج الـ PR تلقائياً بنفس التوكن (خطة الدفعة 4، المهمة 2).
//   مرّر false لترك الـ PR للمراجعة اليدوية بدون دمج.
//   ⚠️ قرار المدير الأمني الصريح (جلسة 4): لأي pkg من kind "subject-deletion"،
//   الدمج التلقائي مرفوض دائماً بلا استثناء — يُفرَض autoMerge=false داخلياً هنا
//   بصرف النظر عمّا يُمرَّر بالمعامل، فلا يقدر أي طرف يتجاوز هذي القاعدة بالغلط.
// exportPackageAsZip(pkg) → Blob (ويُنزَّل تلقائياً بالمتصفح — pdf/image فقط pkg.subject-package)

// استيراد أدوات ASCII slug من عضو 4 — إلزامي لكل من اسم ملف lectures*.json
// (professorId) وأسماء ملفات المحتوى الفعلية (pdf/image)، حسب خطة إصلاح
// ASCII §4.7 المحدَّثة، القسم 3 (مهام عضو 5).
import { transliterateToSlug, isValidSlug } from "./idSlug.js";

const SECTION_ORDER = ["theory", "lab", "extra", "exam"];

// عناصر pdf/image فقط تنتج ملفاً فعلياً؛ link/note تُكتب مباشرة بالـ JSON بلا رفع.
const FILE_BACKED_TYPES = new Set(["pdf", "image"]);

// صيغ الصور المقبولة حصراً — لا SVG (خطر تنفيذ سكربت داخل الصورة).
const IMAGE_MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** يحوّل الاسم اللي يكتبه الآدمن إلى اسم ملف فعلي — ASCII إلزامي دائماً
 * (خطة إصلاح ASCII §4.7 المحدَّثة، §3.1: عبر transliterateToSlug عضو 4)،
 * بصرف النظر عن لغة العنوان المعروض. العنوان العربي الأصلي يبقى محفوظاً
 * حرفياً بحقل title بالـ JSON — هذا التحويل يخص اسم الملف على القرص فقط.
 * يشيل امتداد معروف (pdf/png/jpg/jpeg/webp) لو كتبه الآدمن بنفسه قبل
 * التحويل (تفادي title.pdf.pdf)، ثم يحوّل شرطات transliterateToSlug إلى
 * "_" للحفاظ على نفس نمط التسمية المعتمَد سابقاً بالمشروع
 * ("دارات_نظري_1" بدل "drt-nzry-1"). */
function sanitizeFileTitle(title) {
  const withoutExt = String(title || "")
    .trim()
    .replace(/\.(pdf|png|jpe?g|webp)$/i, "");
  return transliterateToSlug(withoutExt).replace(/-/g, "_");
}

/** يتحقق أن الرابط يبدأ http:// أو https:// — يُطبَّق هنا إضافة لتحقق واجهة
 * عضو 3 (كلا الطرفين معاً حسب العقد المشترك)، لأن buildSubjectPackage قد
 * تُستدعى من مسارات أخرى غير الواجهة (اختبارات، سكربتات) لاحقاً. */
function isValidHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

/** يبني حزمة الملفات الجاهزة (subject.json, lectures.json, مسارات PDF)
 * من بيانات نموذج المادة + الملفات المرفوعة. */
export function buildSubjectPackage({ subjectMeta, items = [] }) {
  if (!subjectMeta?.id) {
    throw new Error("buildSubjectPackage: subjectMeta.id (slug) مطلوب");
  }

  const slug = subjectMeta.id;
  const multiProfessor = Boolean(subjectMeta.professorId);

  // خط دفاع أخير (خطة إصلاح ASCII §4.7 المحدَّثة، §3.2): حتى لو مرّ professorId
  // غير ASCII من كل الطبقات السابقة (نموذج عضو 3، أو أي مسار استدعاء آخر
  // مستقبلاً غير الواجهة)، لا نبني اسم ملف تالفاً بصمت — نرفض النشر برسالة
  // واضحة. لا نعتمد فقط على تحقق الواجهة أو استخدام suggestProfessorId.
  if (multiProfessor && !isValidSlug(subjectMeta.professorId, [])) {
    throw new Error(
      `buildSubjectPackage: professorId "${subjectMeta.professorId}" غير صالح — ` +
        `يجب أن يكون ASCII slug (أحرف إنجليزية صغيرة/أرقام/شرطات فقط، مثل "prof-alaa"). ` +
        `استخدم suggestProfessorId من idSlug.js لتوليده تلقائياً من اسم الدكتور.`
    );
  }

  const lecturesFileName = multiProfessor
    ? `lectures-${subjectMeta.professorId}.json`
    : "lectures.json";

  // --- بناء subject.json (يحافظ على professorVariants الأخرى إن وُجدت) ---
  const subjectJson = {
    id: slug,
    name: subjectMeta.name,
    code: subjectMeta.code,
    hidden: Boolean(subjectMeta.hidden),
  };

  if (multiProfessor) {
    const prevVariants = Array.isArray(subjectMeta.existingSubject?.professorVariants)
      ? [...subjectMeta.existingSubject.professorVariants]
      : [];

    const idx = prevVariants.findIndex((v) => v.professorId === subjectMeta.professorId);
    const setActiveExplicit = typeof subjectMeta.setActive === "boolean";
    // إصلاح (مراجعة الجولة 2، القسم 2.2): لو setActive لم تُمرَّر صراحة ولدكتور
    // موجود مسبقاً (idx >= 0)، يجب الحفاظ على حالة active السابقة كما هي، لا
    // افتراض false — وإلا يُصفَّر الدكتور النشِط عند مجرد تعديل محتواه.
    let shouldBeActive;
    if (setActiveExplicit) {
      shouldBeActive = subjectMeta.setActive;
    } else if (idx >= 0) {
      shouldBeActive = prevVariants[idx].active;
    } else {
      shouldBeActive = prevVariants.length === 0;
    }

    const newVariant = {
      professorId: subjectMeta.professorId,
      professorName: subjectMeta.professorName || subjectMeta.professorId,
      active: shouldBeActive,
      lecturesFile: lecturesFileName,
    };

    let variants;
    if (idx >= 0) {
      variants = prevVariants.map((v, i) => (i === idx ? { ...v, ...newVariant } : v));
    } else {
      variants = [...prevVariants, newVariant];
    }
    // لو صار هذا الدكتور نشطاً، نطفئ البقية (نشِط واحد فقط في كل لحظة)
    if (shouldBeActive) {
      variants = variants.map((v) =>
        v.professorId === subjectMeta.professorId ? v : { ...v, active: false }
      );
    }
    subjectJson.professorVariants = variants;
  } else if (subjectMeta.existingSubject?.professorVariants) {
    // توافق عكسي: لو المادة كانت أصلاً بدون تعدد دكاترة نتركها كذلك
    subjectJson.professorVariants = subjectMeta.existingSubject.professorVariants;
  }

  // --- بناء lectures.json (دمج مع الموجود سابقاً إن وُجد) ---
  const existingSections = Array.isArray(subjectMeta.existingLectures?.sections)
    ? subjectMeta.existingLectures.sections.map((s) => ({ ...s, items: [...(s.items || [])] }))
    : [];

  // --- تسمية الملف: تُشتق من الاسم اللي يختاره الآدمن للعرض (title) ---
  // (تعديل بطلب المدير: لا ترقيم تلقائي lecture-NN — الاسم الظاهر بقسم المادة
  // هو نفسه اسم الملف الفعلي على GitHub، مع فرض امتداد يطابق النوع: .pdf
  // لعناصر pdf، أو .png/.jpg/.webp لعناصر image حسب صيغتها الفعلية).
  const usedNames = new Set();
  existingSections.forEach((s) =>
    (s.items || []).forEach((it) => {
      if (it.file) usedNames.add(it.file);
    })
  );

  function uniqueFileName(title, fallback, ext) {
    const base = sanitizeFileTitle(title) || sanitizeFileTitle(fallback) || "ملف";
    let fileName = `${base}.${ext}`;
    let i = 2;
    while (usedNames.has(fileName)) {
      fileName = `${base}_${i}.${ext}`;
      i += 1;
    }
    usedNames.add(fileName);
    return fileName;
  }

  const pdfFiles = [];
  const sectionsBySection = new Map(existingSections.map((s) => [s.section, s]));

  for (const entry of items) {
    // غياب type بالبيانات = "pdf" دائماً (توافق عكسي — العقد المشترك مع عضو 3).
    const type = entry.type || "pdf";
    const sectionKey = entry.section || "theory";
    if (!sectionsBySection.has(sectionKey)) {
      const fresh = { section: sectionKey, hidden: false, items: [] };
      sectionsBySection.set(sectionKey, fresh);
    }
    const target = sectionsBySection.get(sectionKey);

    if (FILE_BACKED_TYPES.has(type)) {
      // --- pdf / image: نفس منطق رفع الملف الحالي، بامتداد يطابق النوع ---
      let ext = "pdf";
      if (type === "image") {
        ext = IMAGE_MIME_TO_EXT[entry.file?.type];
        if (!ext) {
          throw new Error(
            `buildSubjectPackage: صيغة صورة غير مدعومة للعنصر "${
              entry.title || entry.file?.name || ""
            }" — المسموح فقط png/jpeg/webp (لا SVG)`
          );
        }
      }
      const displayTitle = entry.title || entry.file?.name || "ملف";
      // مجلد الملفات الفعلية يبقى public/pdf/{slug}/ بلا تغيير، حتى لملفات image.
      const fileName = uniqueFileName(entry.title, entry.file?.name, ext);
      const path = `public/pdf/${slug}/${fileName}`;

      target.items.push({
        type,
        title: displayTitle,
        file: fileName,
        hidden: Boolean(entry.hidden),
      });

      pdfFiles.push({ path, file: entry.file, name: fileName });
    } else if (type === "link") {
      // --- link: بلا رفع ملف — تحقق الرابط مطبَّق هنا أيضاً (كلا الطرفين معاً) ---
      if (!isValidHttpUrl(entry.url)) {
        throw new Error(
          `buildSubjectPackage: رابط غير صالح للعنصر "${
            entry.title || ""
          }" — يجب أن يبدأ بـ http:// أو https://`
        );
      }
      target.items.push({
        type: "link",
        title: entry.title || entry.url.trim(),
        url: entry.url.trim(),
        hidden: Boolean(entry.hidden),
      });
    } else if (type === "note") {
      // --- note: بلا رفع ملف — نص خام فقط ---
      target.items.push({
        type: "note",
        title: entry.title || "ملاحظة",
        content: String(entry.content ?? ""),
        hidden: Boolean(entry.hidden),
      });
    } else {
      throw new Error(`buildSubjectPackage: نوع عنصر غير معروف "${type}"`);
    }
  }

  const sections = SECTION_ORDER.filter((k) => sectionsBySection.has(k)).map((k) =>
    sectionsBySection.get(k)
  );
  // أي قسم غير قياسي (احتياط) يُضاف بالنهاية بدل ما يُفقد
  for (const [key, val] of sectionsBySection) {
    if (!SECTION_ORDER.includes(key)) sections.push(val);
  }

  const lecturesJson = { sections };

  // --- تحديث public/data/study-plan.json (إصلاح تقرير عضو 6، 2026-07-19) ---
  // النشر كان يكتب subject.json/lectures.json فقط، وما كان يلمس study-plan.json
  // إطلاقاً — فالمادة الجديدة/المعدَّلة كانت تبقى غير مرئية بصفحتي "المواد" و"الخطة
  // الدراسية" (كلاهما يقرآن من study-plan.json حصراً) حتى لو نُشرت بنجاح فعلياً.
  const existingCourses = Array.isArray(subjectMeta.existingStudyPlan?.courses)
    ? [...subjectMeta.existingStudyPlan.courses]
    : [];
  const courseEntry = {
    id: slug,
    name: subjectJson.name,
    code: subjectJson.code,
    hidden: Boolean(subjectJson.hidden),
  };
  const courseIdx = existingCourses.findIndex((c) => c.id === slug);
  const courses =
    courseIdx >= 0
      ? existingCourses.map((c, i) => (i === courseIdx ? { ...c, ...courseEntry } : c)) // تعديل — لا تكرار
      : [...existingCourses, courseEntry]; // إنشاء جديد
  const studyPlanJson = { ...(subjectMeta.existingStudyPlan || {}), courses };

  return {
    slug,
    subjectPath: `public/data/subjects/${slug}/subject.json`,
    lecturesPath: `public/data/subjects/${slug}/${lecturesFileName}`,
    studyPlanPath: "public/data/study-plan.json",
    studyPlanJson,
    pdfDir: `public/pdf/${slug}`,
    subjectJson,
    lecturesJson,
    pdfFiles,
  };
}

/** يبني حزمة حذف تدميري كامل لمادة — راجع توثيق العقد أعلى الملف.
 * تُبقي الدالة نفسها متزامنة (بلا شبكة) بنفس نمط buildSubjectPackage؛ تحليل
 * محتويات مجلد public/pdf/{slug} الفعلية يحصل لاحقاً وقت النشر (publishToGitHub)
 * لأننا لا نعرف أسماء الملفات بداخله من الطرف اللي يستدعي هذي الدالة. */
export function buildSubjectDeletion(slug, { existingSubject, existingStudyPlan } = {}) {
  if (!slug) throw new Error("buildSubjectDeletion: slug مطلوب");

  const lectureFiles = existingSubject?.professorVariants?.length
    ? existingSubject.professorVariants.map((v) => v.lecturesFile || `lectures-${v.professorId}.json`)
    : ["lectures.json"];

  const filesToDelete = [
    `public/data/subjects/${slug}/subject.json`,
    ...lectureFiles.map((f) => `public/data/subjects/${slug}/${f}`),
  ];

  const remainingCourses = (existingStudyPlan?.courses ?? []).filter((c) => c.id !== slug);

  return {
    kind: "subject-deletion",
    slug,
    filesToDelete,
    pdfDir: `public/pdf/${slug}`, // يُحلَّل ويُحذَف ملفاً ملفاً وقت النشر
    studyPlanPath: "public/data/study-plan.json",
    studyPlanJson: { ...(existingStudyPlan || {}), courses: remainingCourses },
  };
}

/** يبني حزمة تحديث لقائمة المواد الوصفية فقط — بمعزل عن محتوى أي مادة. */
export function buildStudyPlanUpdate(courses) {
  return {
    kind: "study-plan-update",
    studyPlanPath: "public/data/study-plan.json",
    studyPlanJson: { courses },
  };
}

// --- أدوات GitHub API الداخلية ---

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function textToBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

async function getExistingSha({ owner, repo, path, ref, token }) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    { headers: ghHeaders(token) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`تعذّر التحقق من ${path}: ${res.status}`);
  const data = await res.json();
  return data.sha || null;
}

async function putFile({ owner, repo, path, branch, token, message, base64Content }) {
  const sha = await getExistingSha({ owner, repo, path, ref: branch === undefined ? "main" : branch, token }).catch(
    () => null
  );
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: base64Content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`فشل رفع ${path}: ${res.status} ${body}`);
  }
  return res.json();
}

/** يحذف ملفاً إن كان موجوداً فعلاً على الفرع؛ يتجاهل بهدوء لو غير موجود أصلاً
 * (لا نُفشل عملية الحذف كاملة بسبب ملف ناقص مسبقاً — قد يحدث لو تعديل يدوي سابق
 * على الريبو أزاله، أو مادة بلا كل ملفات lectures*.json المتوقعة). */
async function deleteFileIfExists({ owner, repo, path, branch, token, message }) {
  const sha = await getExistingSha({ owner, repo, path, ref: branch, token });
  if (!sha) return;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "DELETE",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`فشل حذف ${path}: ${res.status} ${body}`);
  }
}

/** يسرد ملفات مجلد عبر Contents API — لازمة لحذف public/pdf/{slug}/ بالكامل،
 * لأن GitHub لا يوفّر endpoint يحذف مجلداً دفعة واحدة (قرار/ملاحظة المدير، جلسة 4). */
async function listDirectory({ owner, repo, path, ref, token }) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    { headers: ghHeaders(token) }
  );
  if (res.status === 404) return []; // المجلد غير موجود أصلاً (مادة بلا ملفات مرفوعة قط)
  if (!res.ok) throw new Error(`تعذّر قراءة محتويات ${path}: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.filter((it) => it.type === "file") : [];
}

/** المسار أ: نشر مباشر عبر GitHub Contents API.
 * token: GitHub Personal Access Token (fine-grained, صلاحية contents فقط على هذا الريبو)
 * يُستخدم من الذاكرة فقط، لا يُخزَّن ولا يُرسَل لأي مكان غير api.github.com */
export async function publishToGitHub({
  token,
  owner,
  repo,
  pkg,
  baseBranch = "main",
  autoMerge = true, // خطة الدفعة 4، المهمة 2: افتراضياً يدمج تلقائياً بلا مراجعة يدوية
}) {
  if (!token) throw new Error("مطلوب GitHub token");
  if (!owner || !repo) throw new Error("مطلوب owner/repo");

  const isDeletion = pkg.kind === "subject-deletion";
  const isStudyPlanOnly = pkg.kind === "study-plan-update";

  // ⚠️ قرار المدير الأمني الصريح (جلسة 4): حذف = بلا دمج تلقائي أبداً، بصرف
  // النظر عمّا يُمرَّر بمعامل autoMerge — استثناء دائم لا يقدر أي طرف يتجاوزه.
  const effectiveAutoMerge = isDeletion ? false : autoMerge;

  // 1) sha الفرع الأساسي
  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    { headers: ghHeaders(token) }
  );
  if (!refRes.ok) throw new Error(`تعذّر قراءة الفرع الأساسي (${baseBranch}): ${refRes.status}`);
  const refData = await refRes.json();
  const baseSha = refData.object.sha;

  // 2) فرع جديد للمحتوى
  const branch = `content/${pkg.slug || "study-plan"}-${Date.now()}`;
  const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });
  if (!createRefRes.ok) {
    const body = await createRefRes.text();
    throw new Error(`تعذّر إنشاء الفرع: ${createRefRes.status} ${body}`);
  }

  // 3) تنفيذ التغييرات — يختلف حسب نوع الحزمة
  if (isDeletion) {
    // حذف subject.json + كل lectures*.json المرتبطة
    for (const path of pkg.filesToDelete) {
      await deleteFileIfExists({ owner, repo, path, branch, token, message: `حذف ${path} — ${pkg.slug}` });
    }
    // حذف مجلد public/pdf/{slug} بالكامل — ملفاً ملفاً (لا endpoint لحذف مجلد دفعة واحدة)
    if (pkg.pdfDir) {
      const pdfFiles = await listDirectory({ owner, repo, path: pkg.pdfDir, ref: branch, token });
      for (const f of pdfFiles) {
        await deleteFileIfExists({
          owner,
          repo,
          path: f.path,
          branch,
          token,
          message: `حذف ${f.path} — ${pkg.slug}`,
        });
      }
    }
    await putFile({
      owner,
      repo,
      path: pkg.studyPlanPath,
      branch,
      token,
      message: `إزالة ${pkg.slug} من خطة المواد`,
      base64Content: textToBase64(JSON.stringify(pkg.studyPlanJson, null, 2)),
    });
  } else if (isStudyPlanOnly) {
    // تحديث القائمة الوصفية فقط — لا لمس لأي محتوى مادة
    await putFile({
      owner,
      repo,
      path: pkg.studyPlanPath,
      branch,
      token,
      message: "تحديث خطة المواد",
      base64Content: textToBase64(JSON.stringify(pkg.studyPlanJson, null, 2)),
    });
  } else {
    // النشر العادي (إضافة/تعديل مادة) — subject.json + lectures.json + كل PDF
    await putFile({
      owner,
      repo,
      path: pkg.subjectPath,
      branch,
      token,
      message: `تحديث subject.json — ${pkg.slug}`,
      base64Content: textToBase64(JSON.stringify(pkg.subjectJson, null, 2)),
    });

    await putFile({
      owner,
      repo,
      path: pkg.lecturesPath,
      branch,
      token,
      message: `تحديث بيانات المحاضرات — ${pkg.slug}`,
      base64Content: textToBase64(JSON.stringify(pkg.lecturesJson, null, 2)),
    });

    await putFile({
      owner,
      repo,
      path: pkg.studyPlanPath,
      branch,
      token,
      message: `تحديث خطة المواد — ${pkg.slug}`,
      base64Content: textToBase64(JSON.stringify(pkg.studyPlanJson, null, 2)),
    });

    for (const pdf of pkg.pdfFiles) {
      const base64Content = await fileToBase64(pdf.file);
      await putFile({
        owner,
        repo,
        path: pdf.path,
        branch,
        token,
        message: `إضافة ${pdf.name} — ${pkg.slug}`,
        base64Content,
      });
    }
  }

  // 4) فتح Pull Request
  const prTitle = isDeletion
    ? `حذف مادة: ${pkg.slug}`
    : isStudyPlanOnly
    ? "تحديث خطة المواد"
    : `نشر محتوى: ${pkg.subjectJson.name} (${pkg.slug})`;

  const prBody = isDeletion
    ? `تم إنشاء هذا الطلب تلقائياً من لوحة التحكم لحذف المادة "${pkg.slug}" وكل ملفاتها المرتبطة (بيانات + PDF) وإزالتها من خطة المواد.\n\n⚠️ هذا حذف تدميري — يُترك دائماً للمراجعة اليدوية قبل الدمج، بلا استثناء دمج تلقائي مهما كان إعداد النشر.`
    : isStudyPlanOnly
    ? `تم إنشاء هذا الطلب تلقائياً من لوحة التحكم لتحديث قائمة المواد الوصفية (public/data/study-plan.json) فقط — لا لمس لمحتوى أي مادة.\n\n${
        effectiveAutoMerge
          ? "سيُدمَج تلقائياً بـ " + baseBranch + " مباشرة."
          : "يرجى المراجعة قبل الدمج بـ " + baseBranch + " (تم اختيار عدم الدمج التلقائي)."
      }`
    : `تم إنشاء هذا الطلب تلقائياً من لوحة النشر.\n\n- المادة: ${pkg.subjectJson.name} (${pkg.slug})\n- ملفات مضافة: ${pkg.pdfFiles.length}\n\n${
        effectiveAutoMerge
          ? "سيُدمَج تلقائياً بـ " + baseBranch + " مباشرة."
          : "يرجى المراجعة قبل الدمج بـ " + baseBranch + " (تم اختيار عدم الدمج التلقائي)."
      }`;

  const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: prTitle,
      head: branch,
      base: baseBranch,
      body: prBody,
    }),
  });
  if (!prRes.ok) {
    const body = await prRes.text();
    throw new Error(`تم رفع/حذف الملفات لكن فشل فتح الـ PR: ${prRes.status} ${body}`);
  }
  const prData = await prRes.json();

  // 5) دمج تلقائي (خطة الدفعة 4، المهمة 2) — اختياري عبر autoMerge=false لمن يحتاج
  // مراجعة يدوية استثنائية، ومفروض false دائماً لعمليات الحذف (effectiveAutoMerge
  // أعلاه). لو فشل الدمج (تعارضات، حماية فرع...) لا نُفشل العملية كاملة — الملفات
  // مرفوعة/محذوفة والـ PR مفتوح فعلاً، فقط نُبلغ بأن الدمج يحتاج تدخّلاً يدوياً.
  if (!effectiveAutoMerge) {
    return { prUrl: prData.html_url, branch, merged: false };
  }

  const mergeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prData.number}/merge`,
    {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        commit_title: prTitle,
        merge_method: "squash",
      }),
    }
  );

  if (!mergeRes.ok) {
    const body = await mergeRes.text();
    return {
      prUrl: prData.html_url,
      branch,
      merged: false,
      mergeError: `تم فتح الـ PR لكن فشل الدمج التلقائي (${mergeRes.status}) — يحتاج دمجاً يدوياً: ${body}`,
    };
  }

  return { prUrl: prData.html_url, branch, merged: true };
}

/** المسار ب: تصدير الحزمة كملف ZIP للتنزيل والوضع اليدوي بالريبو (Fallback بدون توكن). */
export async function exportPackageAsZip(pkg) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  zip.file(pkg.subjectPath, JSON.stringify(pkg.subjectJson, null, 2));
  zip.file(pkg.lecturesPath, JSON.stringify(pkg.lecturesJson, null, 2));
  zip.file(pkg.studyPlanPath, JSON.stringify(pkg.studyPlanJson, null, 2));
  for (const pdf of pkg.pdfFiles) {
    zip.file(pdf.path, pdf.file);
  }

  // طبقة حماية إضافية (خطة إصلاح ASCII §4.7 المحدَّثة، §3.3): platform: "UNIX"
  // يفرض ترميز UTF-8 القياسي بحقول ZIP metadata (بدل الترميز الافتراضي
  // المرتبط بـ DOS الذي كان سبب تلف "lectures-الدكتورة.json" أصلاً عند فك
  // الضغط على أنظمة مختلفة). طبقة أخيرة فقط — أسماء الملفات نفسها أصلاً
  // ASCII الآن بفضل sanitizeFileTitle/lecturesFileName أعلاه، حتى لو تسرَّب
  // نص غير متوقَّع مستقبلاً من مسار لم يُغطَّ بالتحقق.
  const blob = await zip.generateAsync({ type: "blob", platform: "UNIX" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pkg.slug}-package.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return blob;
}