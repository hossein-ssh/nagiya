import React, { useState } from 'react';
import { Calculator, X, Check, AlertCircle } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  const [answer, setAnswer] = useState<string>('');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() === '24') {
      setIsCorrect(true);
      setResultMessage('پاسخ صحیح است (۲۴).');
    } else {
      setIsCorrect(false);
      setResultMessage('پاسخ نادرست است. حاصل ۴ × ۶ برابر ۲۴ می‌باشد.');
    }
  };

  const handleKeyPress = (num: string) => {
    setAnswer(prev => prev + num);
  };

  const handleClear = () => {
    setAnswer('');
    setResultMessage(null);
    setIsCorrect(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-100">ابزار محاسباتی و تعاملی</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-1">پرسش ریاضی:</span>
            <span className="text-2xl font-bold tracking-widest font-mono text-blue-400" dir="ltr">
              4 × 6 = ?
            </span>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                پاسخ محاسبه را وارد نمایید:
              </label>
              <input
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="مثال: 24"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Visual keypad */}
            <div className="grid grid-cols-3 gap-1.5" dir="ltr">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '='].map(btn => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === 'C') handleClear();
                    else if (btn === '=') {
                      if (answer.trim() === '24') {
                        setIsCorrect(true);
                        setResultMessage('پاسخ صحیح است (۲۴).');
                      } else {
                        setIsCorrect(false);
                        setResultMessage('پاسخ نادرست است. حاصل ۴ × ۶ برابر ۲۴ می‌باشد.');
                      }
                    } else handleKeyPress(btn);
                  }}
                  className={`py-2 text-sm font-semibold rounded transition-colors ${
                    btn === '='
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : btn === 'C'
                      ? 'bg-rose-900/40 hover:bg-rose-800/60 text-rose-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>

            {resultMessage && (
              <div
                className={`flex items-center gap-2 p-3 text-xs rounded-lg ${
                  isCorrect
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                }`}
              >
                {isCorrect ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{resultMessage}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                بررسی نتیجه
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                بستن
              </button>
            </div>
          </form>

          {/* Explicit disclaimer requested by technical requirements */}
          <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-lg text-[11px] text-amber-300/90 leading-relaxed">
            <span className="font-semibold block mb-0.5">یادداشت فنی:</span>
            این پنجره صرفاً یک تعامل بصری است و تحت هیچ شرایطی نباید به عنوان یک ویژگی امنیتی یا اعتبارسنجی احراز هویت تلقی شود.
          </div>
        </div>
      </div>
    </div>
  );
};
