import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api/client.ts';
import { ActivityReport, ActivityStatus, GroupId, RANK_LABELS } from '../types/index.ts';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  MessageSquare,
  Award,
  X,
  Filter,
} from 'lucide-react';

export const ActivitiesPage: React.FC = () => {
  const { user: currentUser, permissions, activeGroupId } = useAuth();
  const [activities, setActivities] = useState<ActivityReport[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('عملیاتی و رزمی');
  const [hoursSpent, setHoursSpent] = useState<number>(2);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  // Review Modal
  const [reviewActivity, setReviewActivity] = useState<ActivityReport | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [awardedPoints, setAwardedPoints] = useState<number>(20);

  // Lightbox for private image
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (activeGroupId !== 'all') queryParams.append('groupId', activeGroupId);
      if (activeTab !== 'all') queryParams.append('status', activeTab);
      if (categoryFilter !== 'all') queryParams.append('category', categoryFilter);

      const res = await api.get<{ activities: ActivityReport[] }>(`/api/activities?${queryParams.toString()}`);
      setActivities(res.activities);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در بارگذاری فعالیت‌ها.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [activeGroupId, activeTab, categoryFilter]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'فرمت تصویر نامعتبر است. فقط JPG, PNG یا WEBP مجاز هستند.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'حجم تصویر نباید بیش از ۵ مگابایت باشد.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setImageMime(file.type);
      setImageFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/activities', {
        title,
        description,
        category,
        hoursSpent,
        imageBase64,
        imageMime,
      });

      setFeedback({ type: 'success', message: 'گزارش فعالیت با موفقیت ثبت شد و در صف ارزیابی قرار گرفت.' });
      setShowSubmitModal(false);
      setTitle('');
      setDescription('');
      setImageBase64(null);
      setImageMime(null);
      setImageFileName(null);
      fetchActivities();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewActivity) return;

    if (reviewDecision === 'rejected' && !rejectionReason.trim()) {
      setFeedback({ type: 'error', message: 'در صورت رد فعالیت، درج علت رد الزامی است.' });
      return;
    }

    try {
      await api.post(`/api/activities/${reviewActivity.id}/review`, {
        decision: reviewDecision,
        comment: reviewComment,
        rejectionReason: reviewDecision === 'rejected' ? rejectionReason : undefined,
        points: reviewDecision === 'approved' ? awardedPoints : 0,
      });

      setFeedback({
        type: 'success',
        message: reviewDecision === 'approved' ? 'فعالیت تأیید شد و امتیاز مربوطه لحاظ گردید.' : 'گزارش فعالیت رد شد.',
      });
      setReviewActivity(null);
      setReviewComment('');
      setRejectionReason('');
      fetchActivities();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleOpenImage = async (fileName: string) => {
    try {
      const token = api.getToken();
      const res = await fetch(`/api/activities/files/${fileName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('عدم دسترسی به فایل پیوست.');
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setPreviewImageUrl(objUrl);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در بارگذاری تصویر پیوست.' });
    }
  };

  const canReview = Boolean(permissions?.review_activities);

  return (
    <div className="space-y-6">
      {/* Header & Submit Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">کارتابل ثبت و ارزیابی گزارش‌های فعالیت</h2>
          <p className="text-xs text-slate-400 mt-1">
            ثبت مستندات و تصویر پیوست فعالیت‌ها، فرآیند ارزیابی فرماندهی، امتیازدهی و ثبت دلایل رد.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/30 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت گزارش فعالیت جدید</span>
        </button>
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

      {/* Filter Tabs & Category Selector */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Status segmented tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            همه موارد
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            در انتظار بررسی
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            تأیید شده
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            رد شده
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">دسته‌بندی:</span>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">همه دسته‌ها</option>
            <option value="عملیاتی و رزمی">عملیاتی و رزمی</option>
            <option value="آمادگی جسمانی">آمادگی جسمانی</option>
            <option value="پشتیبانی فنی">پشتیبانی فنی</option>
            <option value="آموزش و پژوهش">آموزش و پژوهش</option>
            <option value="انضباطی و هماهنگی">انضباطی و هماهنگی</option>
          </select>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activities.map(act => (
          <div
            key={act.id}
            className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between"
          >
            <div>
              {/* Header meta */}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{act.submitterName}</span>
                  <span>·</span>
                  <span>{act.category}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{act.hoursSpent} ساعت</span>
                </div>
                <div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      act.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : act.status === 'rejected'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {act.status === 'approved'
                      ? 'تأیید شده'
                      : act.status === 'rejected'
                      ? 'رد شده'
                      : 'در انتظار بررسی'}
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-100">{act.title}</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{act.description}</p>

              {/* Private Image Attachment Badge */}
              {act.imageFileName && (
                <div className="mt-3">
                  <button
                    onClick={() => handleOpenImage(act.imageFileName!)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>مشاهده تصویر مستندات پیوست</span>
                  </button>
                </div>
              )}

              {/* Review status details */}
              {act.status !== 'pending' && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs">
                  {act.status === 'approved' && (
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <Award className="w-4 h-4 shrink-0" />
                      <span>{act.awardedPoints} امتیاز ثبت شد</span>
                      {act.reviewerComment && (
                        <span className="text-slate-400 text-[11px]">({act.reviewerComment})</span>
                      )}
                    </div>
                  )}

                  {act.status === 'rejected' && (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300">
                      <span className="font-semibold block mb-0.5">علت رد گزارش:</span>
                      <p className="text-[11px] leading-relaxed">{act.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions for reviewer */}
            {canReview && act.status === 'pending' && act.userId !== currentUser?.id && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setReviewActivity(act);
                    setReviewDecision('approved');
                    setAwardedPoints(20);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تأیید و اعطای امتیاز</span>
                </button>

                <button
                  onClick={() => {
                    setReviewActivity(act);
                    setReviewDecision('rejected');
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>رد گزارش</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {activities.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            هیچ گزارش فعالیتی با فیلتر انتخابی یافت نشد.
          </div>
        )}
      </div>

      {/* Modal: Submit New Activity */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>ثبت و ارسال گزارش فعالیت جدید</span>
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitActivity} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">عنوان گزارش فعالیت:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: انجام گشت شناسایی محدوده شرقی"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">دسته‌بندی:</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="عملیاتی و رزمی">عملیاتی و رزمی</option>
                    <option value="آمادگی جسمانی">آمادگی جسمانی</option>
                    <option value="پشتیبانی فنی">پشتیبانی فنی</option>
                    <option value="آموزش و پژوهش">آموزش و پژوهش</option>
                    <option value="انضباطی و هماهنگی">انضباطی و هماهنگی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">مدت زمان صرف‌شده (ساعت):</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    required
                    value={hoursSpent}
                    onChange={e => setHoursSpent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">شرح کامل فعالیت و اقدامات انجام شده:</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="جزئیات فعالیت، نفرات همراه، نتایج حاصله و نکات قابل توجه..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  پیوست تصویر مستندات (اختیاری - حداکثر ۵ مگابایت):
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="w-full text-slate-400 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
                />
                {imageFileName && (
                  <span className="text-[11px] text-emerald-400 mt-1 block">
                    فایل انتخاب شده: {imageFileName}
                  </span>
                )}
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                >
                  ارسال گزارش به فرماندهی
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review Activity (Approve / Reject) */}
      {reviewActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100">ارزیابی و داوری گزارش فعالیت</h3>
              <button onClick={() => setReviewActivity(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-400 space-y-1">
              <div>عنوان: <strong className="text-slate-200">{reviewActivity.title}</strong></div>
              <div>ارسال‌کننده: <span className="text-slate-200">{reviewActivity.submitterName}</span></div>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    checked={reviewDecision === 'approved'}
                    onChange={() => setReviewDecision('approved')}
                    className="text-emerald-600"
                  />
                  <span className="font-semibold text-emerald-400">تأیید فعالیت</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    checked={reviewDecision === 'rejected'}
                    onChange={() => setReviewDecision('rejected')}
                    className="text-rose-600"
                  />
                  <span className="font-semibold text-rose-400">رد گزارش</span>
                </label>
              </div>

              {reviewDecision === 'approved' ? (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">میزان امتیاز تشویقی:</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={awardedPoints}
                    onChange={e => setAwardedPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono text-center focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-rose-300 font-medium mb-1">
                    علت رد گزارش (الزامی):
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="ذکر نواقص گزارش یا عدم احراز استانداردهای لازم..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">توضیحات و بازخورد فرماندهی:</label>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="توصیه‌ها، نکات یا تشویق کلامی..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className={`flex-1 py-2 font-bold text-white rounded-lg transition-colors ${
                    reviewDecision === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  ثبت نظر نهایی
                </button>
                <button
                  type="button"
                  onClick={() => setReviewActivity(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for private image preview */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => {
                URL.revokeObjectURL(previewImageUrl);
                setPreviewImageUrl(null);
              }}
              className="absolute top-4 right-4 p-2 bg-slate-950/80 hover:bg-slate-950 text-white rounded-full z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageUrl}
              alt="مستندات فعالیت"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
