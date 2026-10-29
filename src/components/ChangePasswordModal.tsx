import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Check, X } from 'lucide-react';
import { api } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ChangePasswordModalProps {
  isOpen: boolean;
  forced?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  forced = false,
  onClose,
  onSuccess,
}) => {
  const { refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('کلمه عبور جدید باید حداقل ۸ کاراکتر باشد.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('تکرار کلمه عبور با کلمه عبور جدید مطابقت ندارد.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (forced) {
        await api.post('/api/auth/change-initial-password', {
          newPassword,
          confirmPassword,
        });
      } else {
        await api.post('/api/auth/change-password', {
          currentPassword,
          newPassword,
          confirmPassword,
        });
      }

      await refreshUser();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'خطا در تغییر کلمه عبور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${forced ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-600/20 text-blue-400'}`}>
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                {forced ? 'تغییر اجباری رمز عبور اولیه' : 'تغییر رمز عبور حساب کاربری'}
              </h3>
              {forced && (
                <p className="text-xs text-amber-400 mt-0.5">
                  جهت برقراری امنیت، تغییر کلمه عبور در نخستین ورود الزامی است.
                </p>
              )}
            </div>
          </div>
          {!forced && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!forced && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                رمز عبور فعلی:
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              رمز عبور جدید (حداقل ۸ کاراکتر):
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              تکرار رمز عبور جدید:
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'در حال ذخیره‌سازی...' : (
                <>
                  <Check className="w-4 h-4" />
                  <span>ثبت رمز عبور جدید</span>
                </>
              )}
            </button>
            {!forced && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                انصراف
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
