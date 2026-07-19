import React, { useState } from "react";
// ⚠️ ملف مملوك لعضو 5 — واجهة النشر فقط، يستدعي lib/githubPublisher.js.
// يُستدعى من داخل SubjectForm.jsx (عضو 3) بالنهاية، بدون أن يحتاج عضو 3
// يعرف أي تفاصيل عن GitHub API.
//
// عقد الاستخدام: <PublishPanel pkg={pkg} /> حيث pkg = buildSubjectPackage(...)
// (عضو 3 يستدعي buildSubjectPackage بنفسه من lib/githubPublisher.js ليبني pkg
// من بيانات النموذج + الملفات، ثم يمرره هنا كما هو).

import { publishToGitHub, exportPackageAsZip } from "../../lib/githubPublisher.js";

// ⚠️ تصحيح إداري (دعم إنتاج): الريبو انتقل إلى QPU_assistant_404 — القيمة
// الافتراضية هنا يجب أن تبقى مطابقة لاسم الريبو الفعلي دائماً، وإلا يفشل
// النشر بـ 404 (كما حصل سابقاً مع الاسم القديم).
const DEFAULT_OWNER = "4cml";
const DEFAULT_REPO = "QPU_assistant_404";

export default function PublishPanel({ pkg }) {
  const [token, setToken] = useState(""); // بذاكرة المتصفح (state) فقط طوال الجلسة، لا يُخزَّن أبداً
  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [status, setStatus] = useState("idle"); // idle | publishing | zipping | success | error
  const [error, setError] = useState(null);
  const [prUrl, setPrUrl] = useState(null);

  const disabled = !pkg || status === "publishing" || status === "zipping";

  async function handlePublish() {
    setError(null);
    setPrUrl(null);
    setStatus("publishing");
    try {
      const { prUrl } = await publishToGitHub({ token, owner, repo, pkg });
      setPrUrl(prUrl);
      setStatus("success");
    } catch (err) {
      setError(err.message || "فشل النشر");
      setStatus("error");
    }
  }

  async function handleDownload() {
    setError(null);
    setStatus("zipping");
    try {
      await exportPackageAsZip(pkg);
      setStatus("idle");
    } catch (err) {
      setError(err.message || "فشل تصدير الحزمة");
      setStatus("error");
    }
  }

  if (!pkg) {
    return (
      <div className="text-text-muted text-sm">
        لا توجد حزمة جاهزة للنشر بعد — عبّئ النموذج وارفع الملفات أولاً.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-bg-subtle space-y-4">
      <div>
        <h3 className="text-text-h font-semibold mb-1">النشر</h3>
        <p className="text-text-muted text-sm">
          {pkg.subjectJson.name} ({pkg.slug}) — {pkg.pdfFiles.length} ملف
        </p>
      </div>

      <div className="bg-warning-bg border border-warning-border text-warning-text text-xs rounded-md p-3">
        التوكن يُستخدم من متصفحك مباشرة للاتصال بـ GitHub فقط (api.github.com) — لا يُخزَّن
        بأي مكان ولا يراه أي عضو آخر. استخدم fine-grained token بصلاحية{" "}
        <code>contents</code> فقط على هذا الريبو تحديداً.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm text-text flex flex-col gap-1">
          Owner
          <input
            className="bg-bg border border-border rounded-md px-2 py-1 text-text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </label>
        <label className="text-sm text-text flex flex-col gap-1">
          Repo
          <input
            className="bg-bg border border-border rounded-md px-2 py-1 text-text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
        </label>
      </div>

      <label className="text-sm text-text flex flex-col gap-1">
        GitHub Personal Access Token (fine-grained, contents فقط)
        <input
          type="password"
          className="bg-bg border border-border rounded-md px-2 py-1 text-text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="github_pat_..."
          autoComplete="off"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePublish}
          disabled={disabled || !token}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium"
        >
          {status === "publishing" ? "جارٍ النشر…" : "نشر مباشر (فتح Pull Request)"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={disabled}
          className="bg-bg-elevated hover:bg-bg-subtle disabled:opacity-50 text-text border border-border rounded-md px-4 py-2 text-sm font-medium"
        >
          {status === "zipping" ? "جارٍ التجهيز…" : "تنزيل حزمة (ZIP)"}
        </button>
      </div>

      {status === "success" && prUrl && (
        <div className="bg-bg-elevated border border-border rounded-md p-3 text-sm text-text">
          تم رفع الملفات وفتح Pull Request للمراجعة:{" "}
          <a
            href={prUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            {prUrl}
          </a>
        </div>
      )}

      {status === "error" && error && (
        <div className="bg-danger-bg border border-danger-border text-danger-text text-sm rounded-md p-3">
          {error}
        </div>
      )}
    </div>
  );
}
