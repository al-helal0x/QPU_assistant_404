// ⚠️ ملف مملوك لعضو 5 (خط أنابيب النشر) — القسم 5 من خطة البناء
//
// عقد هذا الملف (للتوثيق فقط، ينسخه عضو 6 لاحقاً إلى docs/data-schema.md):
//
// buildSubjectPackage({ subjectMeta, files }) → pkg
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
//   files: Array<{
//     file: File,                 // ملف PDF من جهاز المدير
//     title: string,               // عنوان المحاضرة/الملف — يُشتق منه اسم الملف الفعلي
//                                  // مباشرة (title.pdf، بعد تنظيف الرموز غير الصالحة)،
//                                  // + لاحقة رقمية (_2, _3...) تلقائياً عند تكرار نفس الاسم
//     section: "theory"|"lab"|"extra"|"exam", // مفاتيح SECTION_LABELS (عضو 1/التسليم الثابت)
//     hidden?: boolean,
//   }>
//
//   → pkg: {
//     slug, subjectPath, lecturesPath, pdfDir, studyPlanPath,
//     subjectJson, lecturesJson, studyPlanJson,
//     pdfFiles: [{ path, file, name }],  // name = نفس اسم الملف الظاهر (title.pdf)
//   }
//
// publishToGitHub({ token, owner, repo, pkg, baseBranch?, autoMerge? }) → { prUrl, branch, merged, mergeError? }
//   autoMerge: افتراضي true — يدمج الـ PR تلقائياً بنفس التوكن (خطة الدفعة 4، المهمة 2).
//   مرّر false لترك الـ PR للمراجعة اليدوية بدون دمج.
// exportPackageAsZip(pkg) → Blob (ويُنزَّل تلقائياً بالمتصفح)

const SECTION_ORDER = ["theory", "lab", "extra", "exam"];

/** يحوّل الاسم اللي يكتبه الآدمن إلى اسم ملف صالح — يحافظ على العربي/الأرقام،
 * يشيل امتداد .pdf لو كتبه الآدمن بنفسه (تفادي .pdf.pdf)، يشيل رموز غير مسموحة
 * بأنظمة الملفات/الروابط، ويحوّل المسافات لـ "_" (نفس نمط "دارات_نظري_1"). */
function sanitizeFileTitle(title) {
  return String(title || "")
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[\\/:*?"<>|؟،]/g, "")
    .replace(/\s+/g, "_");
}

/** يبني حزمة الملفات الجاهزة (subject.json, lectures.json, مسارات PDF)
 * من بيانات نموذج المادة + الملفات المرفوعة. */
export function buildSubjectPackage({ subjectMeta, files = [] }) {
  if (!subjectMeta?.id) {
    throw new Error("buildSubjectPackage: subjectMeta.id (slug) مطلوب");
  }

  const slug = subjectMeta.id;
  const multiProfessor = Boolean(subjectMeta.professorId);
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

  // --- تسمية الملف: تُشتق من الاسم اللي يختاره الآدمن للعرض (title)، + .pdf دايماً ---
  // (تعديل بطلب المدير: لا ترقيم تلقائي lecture-NN — الاسم الظاهر بقسم المادة
  // هو نفسه اسم الملف الفعلي على GitHub، فقط مع فرض امتداد .pdf في النهاية).
  const usedNames = new Set();
  existingSections.forEach((s) =>
    (s.items || []).forEach((it) => {
      if (it.file) usedNames.add(it.file);
    })
  );

  function uniqueFileName(title, fallback) {
    const base = sanitizeFileTitle(title) || sanitizeFileTitle(fallback) || "ملف";
    let fileName = `${base}.pdf`;
    let i = 2;
    while (usedNames.has(fileName)) {
      fileName = `${base}_${i}.pdf`;
      i += 1;
    }
    usedNames.add(fileName);
    return fileName;
  }

  const pdfFiles = [];
  const sectionsBySection = new Map(existingSections.map((s) => [s.section, s]));

  for (const entry of files) {
    const sectionKey = entry.section || "theory";
    if (!sectionsBySection.has(sectionKey)) {
      const fresh = { section: sectionKey, hidden: false, items: [] };
      sectionsBySection.set(sectionKey, fresh);
    }
    const target = sectionsBySection.get(sectionKey);
    const displayTitle = entry.title || entry.file?.name || "ملف";
    const fileName = uniqueFileName(entry.title, entry.file?.name);
    const path = `public/pdf/${slug}/${fileName}`;

    target.items.push({
      title: displayTitle,
      file: fileName,
      hidden: Boolean(entry.hidden),
    });

    pdfFiles.push({ path, file: entry.file, name: fileName });
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

  // 1) sha الفرع الأساسي
  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    { headers: ghHeaders(token) }
  );
  if (!refRes.ok) throw new Error(`تعذّر قراءة الفرع الأساسي (${baseBranch}): ${refRes.status}`);
  const refData = await refRes.json();
  const baseSha = refData.object.sha;

  // 2) فرع جديد للمحتوى
  const branch = `content/${pkg.slug}-${Date.now()}`;
  const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });
  if (!createRefRes.ok) {
    const body = await createRefRes.text();
    throw new Error(`تعذّر إنشاء الفرع: ${createRefRes.status} ${body}`);
  }

  // 3) رفع الملفات (subject.json + lectures.json + كل PDF)
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

  // 4) فتح Pull Request
  const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `نشر محتوى: ${pkg.subjectJson.name} (${pkg.slug})`,
      head: branch,
      base: baseBranch,
      body: `تم إنشاء هذا الطلب تلقائياً من لوحة النشر.\n\n- المادة: ${pkg.subjectJson.name} (${pkg.slug})\n- ملفات مضافة: ${pkg.pdfFiles.length}\n\n${
        autoMerge
          ? "سيُدمَج تلقائياً بـ " + baseBranch + " مباشرة."
          : "يرجى المراجعة قبل الدمج بـ " + baseBranch + " (تم اختيار عدم الدمج التلقائي)."
      }`,
    }),
  });
  if (!prRes.ok) {
    const body = await prRes.text();
    throw new Error(`تم رفع الملفات لكن فشل فتح الـ PR: ${prRes.status} ${body}`);
  }
  const prData = await prRes.json();

  // 5) دمج تلقائي (خطة الدفعة 4، المهمة 2) — اختياري عبر autoMerge=false لمن يحتاج
  // مراجعة يدوية استثنائية. لو فشل الدمج (تعارضات، حماية فرع...) لا نُفشل العملية
  // كاملة — الملفات مرفوعة والـ PR مفتوح فعلاً، فقط نُبلغ بأن الدمج يحتاج تدخّلاً يدوياً.
  if (!autoMerge) {
    return { prUrl: prData.html_url, branch, merged: false };
  }

  const mergeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prData.number}/merge`,
    {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        commit_title: `نشر محتوى: ${pkg.subjectJson.name} (${pkg.slug})`,
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

  const blob = await zip.generateAsync({ type: "blob" });

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
