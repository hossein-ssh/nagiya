import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api/client.ts';
import { TestSuiteReport } from '../../test/test-runner.ts';
import {
  ShieldCheck,
  Database,
  Download,
  Upload,
  RotateCcw,
  Play,
  CheckCircle2,
  XCircle,
  FileJson,
  Archive,
  AlertTriangle,
  X,
} from 'lucide-react';
import { DestructiveConfirmModal } from '../components/DestructiveConfirmModal.tsx';

export const SystemBackupPage: React.FC = () => {
  const { user: currentUser, permissions } = useAuth();
  const [backups, setBackups] = useState<string[]>([]);
  const [testReport, setTestReport] = useState<TestSuiteReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Confirm modals
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const fetchBackups = async () => {
    try {
      const res = await api.get<{ backups: string[] }>('/api/system/backups');
      setBackups(res.backups);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      const res = await api.post<{ message: string; fileName: string }>('/api/system/backup');
      setFeedback({ type: 'success', message: `نسخه پشتیبان "${res.fileName}" با موفقیت ذخیره شد.` });
      fetchBackups();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleRestore = async () => {
    if (!confirmRestoreFile) return;
    try {
      await api.post('/api/system/restore', { backupFileName: confirmRestoreFile });
      setFeedback({ type: 'success', message: 'پایگاه داده با موفقیت از فایل پشتیبان بازگردانی شد.' });
      setConfirmRestoreFile(null);
      fetchBackups();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleResetSeed = async () => {
    try {
      await api.post('/api/system/reset-seed');
      setFeedback({ type: 'success', message: 'پایگاه داده به حالت اولیه آزمایشی با موفقیت بازنشانی گردید.' });
      setShowConfirmReset(false);
      fetchBackups();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await api.post<{ results: TestSuiteReport }>('/api/system/run-automated-tests');
      setTestReport(res.results);
      setFeedback({
        type: 'success',
        message: `آزمون‌های خودکار با موفقیت در سرور اجرا شدند (${res.results.passed} آزمون موفق، ${res.results.failed} ناموفق).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleDownloadExport = async () => {
    try {
      const token = api.getToken();
      const res = await fetch('/api/system/export-json', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در دانلود خروجی داده‌ها.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">پشتیبان‌گیری، بازیابی و آزمون‌های خودکار امنیتی</h2>
          <p className="text-xs text-slate-400 mt-1">
            مدیریت پایگاه داده پایدار، تهیه نسخه‌های پشتیبان، و اجرای تست‌های زنده انزوای گروه‌ها و سطوح دسترسی.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadExport}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>دریافت خروجی JSON</span>
          </button>

          <button
            onClick={handleCreateBackup}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/30 flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            <span>تهیه نسخه پشتیبان جدید</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Automated Security & Isolation Testing Console */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>کنسول اجرای آزمون‌های خودکار سرور (Automated Security Test Suite)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              تست واقعی و زنده اعتبارسنجی Scrypt، انزوای کامل گروه الف و ب، مسدودسازی حساب‌های غیرفعال و عدم امکان خود‌تأییدی اعضا.
            </p>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-emerald-900/30 whitespace-nowrap"
          >
            <Play className="w-4 h-4" />
            <span>{isRunningTests ? 'در حال اجرای تست‌ها در سرور...' : 'اجرای زنده تمام آزمون‌ها'}</span>
          </button>
        </div>

        {testReport ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">
                وضعیت کلی: <strong className={testReport.allPassed ? 'text-emerald-400' : 'text-rose-400'}>
                  {testReport.allPassed ? 'تمام آزمون‌ها با موفقیت سپری شدند ✓' : 'برخی آزمون‌ها ناموفق بودند ✗'}
                </strong>
              </span>
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="text-slate-400">مجموع: {testReport.total}</span>
                <span className="text-emerald-400">موفق: {testReport.passed}</span>
                <span className="text-rose-400">ناموفق: {testReport.failed}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testReport.tests.map(test => (
                <div
                  key={test.id}
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                    test.passed
                      ? 'bg-slate-950/50 border-emerald-900/60 text-slate-200'
                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{test.name}</span>
                      <span className="font-mono tabular-nums text-[11px] text-slate-500">
                        {test.durationMs}ms
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-400 block mt-0.5">{test.category}</span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{test.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
            جهت تأیید عملیاتی بودن سیستم و ارزیابی قوانین امنیتی، دکمه «اجرای زنده تمام آزمون‌ها» را بفشارید.
          </div>
        )}
      </div>

      {/* Backups List & Reset Seed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backups List */}
        <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span>فایل‌های پشتیبان ذخیره‌شده بر روی دیسک</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {backups.length} نسخه
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {backups.map(file => (
              <div
                key={file}
                className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 font-mono text-slate-300">
                  <FileJson className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] truncate max-w-xs">{file}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmRestoreFile(file)}
                    className="px-3 py-1 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>بازیابی این نسخه</span>
                  </button>
                </div>
              </div>
            ))}

            {backups.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">
                هنوز هیچ نسخه پشتیبانی تهیه نشده است.
              </p>
            )}
          </div>
        </div>

        {/* Development Seed Reset Box */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 mb-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>بازنشانی به داده‌های آزمایشی</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              این عملیات دیتابیس را به داده‌های اولیه تستی (شامل اعضای گروه‌های الف و ب، سوابق حضور، و امتیازات) بازمی‌گرداند.
              قبل از ریست، یک نسخه پشتیبان خودکار ایجاد می‌شود.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => setShowConfirmReset(true)}
              className="w-full py-2.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold rounded-xl transition-colors"
            >
              بازنشانی پایگاه داده (Reset to Seed)
            </button>
          </div>
        </div>
      </div>

      {/* Restore Confirmation */}
      <DestructiveConfirmModal
        isOpen={Boolean(confirmRestoreFile)}
        title="بازیابی پایگاه داده"
        message={`آیا از بازگردانی پایگاه داده از نسخه پشتیبان "${confirmRestoreFile}" اطمینان دارید؟ داده‌های فعلی با محتوای این نسخه جایگزین خواهند شد.`}
        confirmLabel="بازیابی شود"
        onConfirm={handleRestore}
        onClose={() => setConfirmRestoreFile(null)}
      />

      {/* Reset Seed Confirmation */}
      <DestructiveConfirmModal
        isOpen={showConfirmReset}
        title="بازنشانی به داده‌های آزمایشی اولیه"
        message="آیا از بازنشانی کلیه جداول و اعضا به داده‌های اولیه اطمینان دارید؟ نسخه پشتیبان قبل از اعمال ذخیره خواهد شد."
        confirmLabel="بازنشانی شود"
        onConfirm={handleResetSeed}
        onClose={() => setShowConfirmReset(false)}
      />
    </div>
  );
};
