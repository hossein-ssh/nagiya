import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Calculator, ShieldCheck, KeyRound, Phone, AlertCircle, Sparkles } from 'lucide-react';
import { CalculatorModal } from '../components/CalculatorModal.tsx';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const testAccounts = [
    { label: 'مدیر ارشد (Super Admin)', phone: '09120000001', pass: 'Admin@123456', desc: 'دسترسی کامل، مدیریت نقش‌ها و لاگ‌ها' },
    { label: 'رهبر (Leader)', phone: '09120000002', pass: 'Leader@123456', desc: 'دسترسی نظارتی به هر دو گروه' },
    { label: 'فرمانده کل (Commander-in-Chief)', phone: '09120000003', pass: 'Chief@123456', desc: 'دسترسی عملیاتی به هر دو گروه' },
    { label: 'فرمانده گروه الف (ذوالفقار)', phone: '09120000010', pass: 'CmdA@123456', desc: 'دسترسی اختصاصی و انحصاری به گروه الف' },
    { label: 'منشی گروه الف (ذوالفقار)', phone: '09120000011', pass: 'SecA@123456', desc: 'ثبت حضور و غیاب و امور اداری گروه الف' },
    { label: 'عضو گروه الف (تست اجبار تغییر رمز)', phone: '09120000012', pass: 'MemberA@123456', desc: 'نیاز به تغییر رمز عبور در ورود اول' },
    { label: 'فرمانده گروه ب (رعد)', phone: '09120000020', pass: 'CmdB@123456', desc: 'دسترسی اختصاصی و انحصاری به گروه ب' },
    { label: 'عضو عادی گروه ب', phone: '09120000022', pass: 'MemberB@123456', desc: 'مشاهده کارتابل، ثبت فعالیت، درخواست مرخصی' },
    { label: 'کاربر مسدود شده (تست امنیت)', phone: '09120000099', pass: 'Disabled@123456', desc: 'آزمون رد دسترسی حساب‌های مسدود شده' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(phone, password);
    } catch (err: any) {
      setError(err.message || 'خطا در ورود به سامانه.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTestAccount = (acc: typeof testAccounts[0]) => {
    setPhone(acc.phone);
    setPassword(acc.pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 z-10">
        {/* Header & Logo */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100">سامانه جامع مدیریت اعضا</h1>
              <p className="text-xs text-slate-400 mt-0.5">ورود به پنل یکپارچه گروه‌های الف و ب</p>
            </div>
          </div>

          {/* Calculator Icon Trigger as required by prompt */}
          <button
            type="button"
            onClick={() => setShowCalculator(true)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 rounded-xl border border-slate-700/60 transition-colors"
            title="ماشین‌حساب تعاملی"
          >
            <Calculator className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              شماره تلفن همراه:
            </label>
            <div className="relative">
              <input
                type="text"
                dir="ltr"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="09120000001"
                required
                className="w-full pl-3 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              کلمه عبور:
            </label>
            <div className="relative">
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-3 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? 'در حال بررسی اطلاعات امنیتی...' : 'ورود به سامانه'}
          </button>
        </form>

        {/* Quick Test Accounts for Instant Evaluation */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>حساب‌های تستی آماده جهت بررسی فوری:</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {testAccounts.map(acc => (
              <button
                key={acc.phone}
                type="button"
                onClick={() => handleSelectTestAccount(acc)}
                className="text-right p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200 group-hover:text-blue-300">{acc.label}</span>
                  <span className="font-mono text-[11px] text-slate-400" dir="ltr">{acc.phone}</span>
                </div>
                <span className="block text-[10px] text-slate-500 mt-0.5">{acc.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Arithmetic calculator prompt modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
    </div>
  );
};
