import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./lib/theme/ThemeContext.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import Header from "./components/layout/Header.jsx";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو أثناء مرحلة العمل المتوازي.
// كل المسارات مسجَّلة من اليوم الأول (بما فيها /admin) — لا حاجة لأي عضو
// يرجع يعدّل هذا الملف لاحقاً لإضافة مسار.
//
// الصفحات مستوردة بـ lazy() من مسارات ثابتة (القسم 2 بخطة البناء).
// كل عضو يسلّم ملف صفحته بنفس المسار والاسم المتفق عليه بالضبط.

const SubjectList = lazy(() => import("./pages/SubjectList.jsx"));
const Subject = lazy(() => import("./pages/Subject.jsx"));
const StudyPlan = lazy(() => import("./pages/StudyPlan.jsx"));
const AdminHome = lazy(() => import("./pages/Admin/AdminHome.jsx"));
const AdminSubjectEditor = lazy(() => import("./pages/Admin/AdminSubjectEditor.jsx"));
const AdminSectionsManager = lazy(() => import("./pages/Admin/AdminSectionsManager.jsx"));

function PageFallback() {
  return <div className="p-6 text-text-muted">...جارِ التحميل</div>;
}

export default function App() {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-bg text-text" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 md:p-6">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<SubjectList />} />
                <Route path="/subject/:id" element={<Subject />} />
                <Route path="/study-plan" element={<StudyPlan />} />
                <Route path="/admin" element={<AdminHome />} />
                <Route path="/admin/subject/:id?" element={<AdminSubjectEditor />} />
                <Route path="/admin/sections" element={<AdminSectionsManager />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

function NotFound() {
  return (
    <div className="p-10 text-center text-text-muted">
      الصفحة غير موجودة
    </div>
  );
}
