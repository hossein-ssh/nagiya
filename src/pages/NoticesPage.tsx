import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api/client.ts';
import { Notice, NoticeType, GroupId } from '../types/index.ts';
import {
  BellRing,
  Plus,
  Compass,
  AlertTriangle,
  Award,
  Calendar,
  Megaphone,
  CheckCheck,
  Trash2,
  X,
  Filter,
} from 'lucide-react';
import { DestructiveConfirmModal } from '../components/DestructiveConfirmModal.tsx';

export const NoticesPage: React.FC = () => {
  const { user: currentUser, permissions, activeGroupId } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoticeType>('task_mission');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [targetGroupId, setTargetGroupId] = useState<string>(activeGroupId === 'all' ? 'all' : activeGroupId);

  // Delete Confirm
  const [deleteNoticeItem, setDeleteNoticeItem] = useState<Notice | null>(null);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedType !== 'all') queryParams.append('type', selectedType);
      if (selectedPriority !== 'all') queryParams.append('priority', selectedPriority);

      const res = await api.get<{ notices: Notice[] }>(`/api/notices?${queryParams.toString()}`);
      setNotices(res.notices);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در بارگذاری ابلاغیه‌ها.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [selectedType, selectedPriority]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/notices', {
        title,
        content,
        type,
        priority,
        targetGroupId,
      });

      setFeedback({ type: 'success', message: 'ابلاغیه/اطلاعیه با موفقیت صادر و منتشر گردید.' });
      setShowCreateModal(false);
      setTitle('');
      setContent('');
      fetchNotices();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/api/notices/${id}/read`);
      setNotices(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteNotice = async () => {
    if (!deleteNoticeItem) return;
    try {
      await api.delete(`/api/notices/${deleteNoticeItem.id}`);
      setFeedback({ type: 'success', message: 'اطلاعیه با موفقیت حذف گردید.' });
      setDeleteNoticeItem(null);
      fetchNotices();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const getTypeIcon = (t: NoticeType) => {
    switch (t) {
      case 'task_mission':
        return <Compass className="w-4 h-4 text-blue-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'reward':
        return <Award className="w-4 h-4 text-emerald-400" />;
      case 'leave':
        return <Calendar className="w-4 h-4 text-amber-400" />;
      default:
        return <Megaphone className="w-4 h-4 text-purple-400" />;
    }
  };

  const getTypeLabel = (t: NoticeType) => {
    switch (t) {
      case 'task_mission':
        return 'مأموریت / وظیفه عملیاتی';
      case 'warning':
        return 'اخطار انضباطی';
      case 'reward':
        return 'تشویق سازمانی';
      case 'leave':
        return 'ابلاغیه مرخصی';
      default:
        return 'اطلاعیه عمومی';
    }
  };

  const canManage = Boolean(permissions?.manage_notices);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">سامانه ابلاغیه‌ها، مأموریت‌ها و هشدارها</h2>
          <p className="text-xs text-slate-400 mt-1">
            صدور و پایش مأموریت‌های تیمی، اخطارها، تشویقی‌ها و اطلاعیه‌های عمومی با ثبت وضعیت مطالعه اعضا.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/30 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>صدور ابلاغیه جدید</span>
          </button>
        )}
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

      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">فیلتر نوع:</span>
        </div>
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">همه انواع</option>
          <option value="task_mission">مأموریت / وظیفه</option>
          <option value="warning">اخطار انضباطی</option>
          <option value="reward">تشویقی</option>
          <option value="leave">مرخصی</option>
          <option value="announcement">اطلاعیه عمومی</option>
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">اولویت:</span>
        </div>
        <select
          value={selectedPriority}
          onChange={e => setSelectedPriority(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">همه اولویت‌ها</option>
          <option value="urgent">فوری</option>
          <option value="high">مهم</option>
          <option value="medium">متوسط</option>
          <option value="low">عادی</option>
        </select>
      </div>

      <div className="space-y-4">
        {notices.map(notice => (
          <div
            key={notice.id}
            className={`p-5 bg-slate-900 border rounded-2xl transition-all ${
              !notice.isRead ? 'border-blue-500/50 bg-slate-900/90' : 'border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-800 rounded-xl border border-slate-700/60">
                  {getTypeIcon(notice.type)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>{notice.title}</span>
                    {!notice.isRead && (
                      <span className="text-[10px] bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded-full font-semibold border border-blue-500/40">
                        جدید (نخوانده)
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{getTypeLabel(notice.type)}</span>
                    <span>·</span>
                    <span>
                      {notice.targetGroupId === 'all'
                        ? 'سراسری (هر دو گروه)'
                        : notice.targetGroupId === 'group_a'
                        ? 'گروه الف (ذوالفقار)'
                        : 'گروه ب (رعد)'}
                    </span>
                    <span>·</span>
                    <span>صادرکننده: {notice.authorName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    notice.priority === 'urgent'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : notice.priority === 'high'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  اولویت: {notice.priority === 'urgent' ? 'فوری' : notice.priority === 'high' ? 'مهم' : 'عادی'}
                </span>

                {!notice.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notice.id)}
                    className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg text-xs transition-colors flex items-center gap-1"
                    title="علامت‌گذاری به عنوان خوانده‌شده"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>خواندم</span>
                  </button>
                )}

                {canManage && (notice.createdByUserId === currentUser?.id || currentUser?.role === 'super_admin') && (
                  <button
                    onClick={() => setDeleteNoticeItem(notice)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="حذف ابلاغیه"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {notice.content}
            </p>
          </div>
        ))}

        {notices.length === 0 && (
          <div className="py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
            هیچ ابلاغیه یا پیامی با فیلتر انتخابی موجود نیست.
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-blue-400" />
                <span>صدور ابلاغیه یا مأموریت جدید</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">عنوان ابلاغیه:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: دستورالعمل آمادگی مانور پاییزی"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">نوع ابلاغیه:</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as NoticeType)}
                    className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="task_mission">مأموریت / وظیفه</option>
                    <option value="warning">اخطار انضباطی</option>
                    <option value="reward">تشویقی</option>
                    <option value="leave">مرخصی</option>
                    <option value="announcement">اطلاعیه عمومی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">اولویت:</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="low">عادی</option>
                    <option value="medium">متوسط</option>
                    <option value="high">مهم</option>
                    <option value="urgent">فوری</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">مخاطب (گروه):</label>
                  <select
                    value={targetGroupId}
                    onChange={e => setTargetGroupId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                  >
                    {(permissions?.view_both_groups || currentUser?.role === 'super_admin') && (
                      <option value="all">سراسری (هر دو گروه)</option>
                    )}
                    <option value="group_a">گروه الف (ذوالفقار)</option>
                    <option value="group_b">گروه ب (رعد)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">متن کامل ابلاغیه:</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="شرح دقیق دستور، زمان‌بندی و الزامات اجرایی..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                >
                  انتشار و ارسال ابلاغیه
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DestructiveConfirmModal
        isOpen={Boolean(deleteNoticeItem)}
        title="حذف ابلاغیه"
        message={`آیا از حذف ابلاغیه "${deleteNoticeItem?.title}" اطمینان دارید؟ این عمل غیرقابل بازگشت است.`}
        confirmLabel="حذف شود"
        onConfirm={handleDeleteNotice}
        onClose={() => setDeleteNoticeItem(null)}
      />
    </div>
  );
};
