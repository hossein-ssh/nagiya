import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DestructiveConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const DestructiveConfirmModal: React.FC<DestructiveConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'تأیید و اجرا',
  cancelLabel = 'انصراف',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-6 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isDestructive ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-600/20 text-blue-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-300 leading-relaxed">{message}</p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 text-white'
                : 'bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white'
            }`}
          >
            {isLoading ? 'در حال پردازش...' : confirmLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
