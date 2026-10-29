import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api/client.ts';
import {
  PointTransaction,
  PointSpendingRequest,
  ScoringRule,
  User,
} from '../types/index.ts';
import {
  Award,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  X,
  SlidersHorizontal,
} from 'lucide-react';

export const PointsPage: React.FC = () => {
  const { user: currentUser, permissions, activeGroupId } = useAuth();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [spendingRequests, setSpendingRequests] = useState<PointSpendingRequest[]>([]);
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'ledger' | 'spending' | 'rules'>('ledger');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual Adjust Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustCategory, setAdjustCategory] = useState<'manual_adjustment' | 'penalty'>('manual_adjustment');

  // Submit Spending Request Modal (Member)
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [spendingPurpose, setSpendingPurpose] = useState('درخواست مرخصی تشویقی یک روزه');
  const [spendingCost, setSpendingCost] = useState<number>(40);

  // Review Spending Request Modal
  const [reviewRequest, setReviewRequest] = useState<PointSpendingRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [transRes, spendRes, rulesRes, membersRes] = await Promise.all([
        api.get<{ transactions: PointTransaction[] }>(`/api/points/ledger?groupId=${activeGroupId}`),
        api.get<{ requests: PointSpendingRequest[] }>(`/api/points/spending-requests?groupId=${activeGroupId}`),
        api.get<{ rules: ScoringRule[] }>('/api/points/rules'),
        api.get<{ users: User[] }>(`/api/users?groupId=${activeGroupId}`),
      ]);

      setTransactions(transRes.transactions);
      setSpendingRequests(spendRes.requests);
      setScoringRules(rulesRes.rules);
      setMembers(membersRes.users);
      if (membersRes.users.length > 0 && !selectedUserId) {
        setSelectedUserId(membersRes.users[0].id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در بارگذاری اطلاعات امتیازات.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeGroupId]);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/points/adjust', {
        userId: selectedUserId,
        amount: adjustAmount,
        reason: adjustReason,
        category: adjustCategory,
      });

      setFeedback({ type: 'success', message: 'تغییر امتیاز با موفقیت در دفتر کل ثبت گردید.' });
      setShowAdjustModal(false);
      setAdjustReason('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSubmitSpendingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/points/spending-requests', {
        pointsCost: spendingCost,
        purpose: spendingPurpose,
      });

      setFeedback({ type: 'success', message: 'درخواست مصرف امتیاز با موفقیت ثبت و جهت تأیید ارسال شد.' });
      setShowSpendingModal(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleReviewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRequest) return;

    try {
      await api.post(`/api/points/spending-requests/${reviewRequest.id}/review`, {
        decision: reviewDecision,
        comment: reviewComment,
      });

      setFeedback({
        type: 'success',
        message: reviewDecision === 'approved' ? 'درخواست تأیید شد و امتیاز از حساب عضو کسر گردید.' : 'درخواست رد شد.',
      });
      setReviewRequest(null);
      setReviewComment('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const canManagePoints = Boolean(permissions?.manage_points);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">دفتر کل امتیازات، پاداش‌ها و مرخصی‌ها</h2>
          <p className="text-xs text-slate-400 mt-1">
            حسابرسی جامع امتیازات اعضا، قوانین امتیازدهی مصوب، و درخواست‌های استفاده از امتیاز جهت مرخصی.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === 'regular_member' && (
            <button
              onClick={() => setShowSpendingModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/30 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>درخواست مرخصی با امتیاز</span>
            </button>
          )}

          {canManagePoints && (
            <button
              onClick={() => setShowAdjustModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/30 flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>تعدیل دستی یا پاداش امتیاز</span>
            </button>
          )}
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

      <div className="p-1 bg-slate-800/80 rounded-xl inline-flex gap-1 text-xs">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'ledger' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
          }`}
        >
          دفتر کل تراکنش‌های امتیاز
        </button>
        <button
          onClick={() => setActiveTab('spending')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'spending' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
          }`}
        >
          درخواست‌های مصرف امتیاز (مرخصی)
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'rules' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
          }`}
        >
          جدول قوانین و ارزش‌گذاری
        </button>
      </div>

      {activeTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="px-4 py-3">تاریخ و زمان</th>
                  <th className="px-4 py-3">عضو ذینفع</th>
                  <th className="px-4 py-3">تغییر امتیاز</th>
                  <th className="px-4 py-3">موجودی پس از تراکنش</th>
                  <th className="px-4 py-3">علت و عنوان رویداد</th>
                  <th className="px-4 py-3">دسته‌بندی</th>
                  <th className="px-4 py-3">ثبت‌کننده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-400 text-[11px]" dir="ltr">
                      {new Date(t.createdAt).toLocaleString('fa-IR')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-100">
                      {t.userFullName}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-bold">
                      <span className={t.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.amount > 0 ? `+${t.amount}` : t.amount}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-200 font-medium">
                      {t.balanceAfter}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {t.reason}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-slate-400">
                        {t.category === 'activity_reward'
                          ? 'پاداش فعالیت/حضور'
                          : t.category === 'spending_leave'
                          ? 'مصرف مرخصی'
                          : t.category === 'penalty'
                          ? 'جریمه انضباطی'
                          : 'تعدیل مدیریتی'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {t.creatorName}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      هیچ تراکنشی در دفتر کل ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'spending' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="px-4 py-3">نام متقاضی</th>
                  <th className="px-4 py-3">هدف و عنوان درخواست</th>
                  <th className="px-4 py-3">امتیاز مورد نیاز</th>
                  <th className="px-4 py-3">موجودی فعلی</th>
                  <th className="px-4 py-3">وضعیت</th>
                  <th className="px-4 py-3">تاریخ ثبت</th>
                  <th className="px-4 py-3 text-center">عملیات بررسی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {spendingRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-100">{req.userFullName}</td>
                    <td className="px-4 py-3 text-slate-200">{req.purpose}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-rose-400 font-bold">
                      -{req.pointsCost}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-300">
                      {req.currentBalance} امتیاز
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                          req.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : req.status === 'rejected'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {req.status === 'approved' ? 'تأیید شد' : req.status === 'rejected' ? 'رد شد' : 'در انتظار بررسی'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-400 text-[11px]" dir="ltr">
                      {new Date(req.requestedAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canManagePoints && req.status === 'pending' && req.userId !== currentUser?.id ? (
                        <button
                          onClick={() => {
                            setReviewRequest(req);
                            setReviewDecision('approved');
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium transition-colors"
                        >
                          بررسی درخواست
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {spendingRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      هیچ درخواستی برای مصرف امتیاز ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="px-4 py-3">عنوان قانون</th>
                  <th className="px-4 py-3">دسته‌بندی</th>
                  <th className="px-4 py-3">امتیاز مصوب</th>
                  <th className="px-4 py-3">شرح ضوابط اجرایی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {scoringRules.map(rule => (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-100">{rule.name}</td>
                    <td className="px-4 py-3 text-slate-400">{rule.category}</td>
                    <td className="px-4 py-3 font-mono tabular-nums font-bold">
                      <span className={rule.defaultPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {rule.defaultPoints >= 0 ? `+${rule.defaultPoints}` : rule.defaultPoints}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{rule.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span>تعدیل دستی یا اعطای پاداش امتیاز</span>
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustPoints} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">انتخاب عضو:</label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.groupId === 'group_a' ? 'گروه الف' : 'گروه ب'} - موجودی فعلی: {m.pointsBalance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">نوع عملیات:</label>
                <select
                  value={adjustCategory}
                  onChange={e => setAdjustCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="manual_adjustment">پاداش یا تشویق فوق‌العاده</option>
                  <option value="penalty">کسر انضباطی یا جریمه</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  میزان امتیاز:
                </label>
                <input
                  type="number"
                  required
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono text-center focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">علت تغییر امتیاز (الزامی جهت دفتر کل):</label>
                <textarea
                  rows={2}
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="مثال: تقدیر بابت دقت در چک‌لیست تجهیزات یا تأخیر غیرموجه..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                >
                  ثبت تراکنش در دفتر کل
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSpendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                <span>درخواست مرخصی با کسر امتیاز</span>
              </h3>
              <button onClick={() => setShowSpendingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-800/80 rounded-xl text-xs flex justify-between items-center">
              <span className="text-slate-400">موجودی امتیاز فعلی شما:</span>
              <span className="font-mono tabular-nums text-emerald-400 font-bold text-sm">
                {currentUser?.pointsBalance} امتیاز
              </span>
            </div>

            <form onSubmit={handleSubmitSpendingRequest} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">عنوان درخواست:</label>
                <input
                  type="text"
                  required
                  value={spendingPurpose}
                  onChange={e => setSpendingPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">هزینه امتیاز درخواستی:</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={spendingCost}
                  onChange={e => setSpendingCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono text-center focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  طبق قانون مصوب، هزینه هر روز مرخصی تشویقی ۴۰ امتیاز می‌باشد.
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={(currentUser?.pointsBalance || 0) < spendingCost}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-lg transition-colors"
                >
                  ارسال درخواست به فرماندهی
                </button>
                <button
                  type="button"
                  onClick={() => setShowSpendingModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100">بررسی درخواست مرخصی با امتیاز</h3>
              <button onClick={() => setReviewRequest(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-400 space-y-1">
              <div>عضو: <strong className="text-slate-200">{reviewRequest.userFullName}</strong></div>
              <div>عنوان: <span className="text-slate-200">{reviewRequest.purpose}</span></div>
              <div>کسر امتیاز: <strong className="text-rose-400 font-mono">-{reviewRequest.pointsCost} امتیاز</strong></div>
            </div>

            <form onSubmit={handleReviewRequest} className="mt-4 space-y-3.5 text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="spendDecision"
                    checked={reviewDecision === 'approved'}
                    onChange={() => setReviewDecision('approved')}
                    className="text-emerald-600"
                  />
                  <span className="font-semibold text-emerald-400">موافقت و کسر امتیاز</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="spendDecision"
                    checked={reviewDecision === 'rejected'}
                    onChange={() => setReviewDecision('rejected')}
                    className="text-rose-600"
                  />
                  <span className="font-semibold text-rose-400">عدم موافقت (رد)</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">توضیحات و دستور فرماندهی:</label>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="ملاحظات مرخصی..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className={`flex-1 py-2.5 font-bold text-white rounded-lg transition-colors ${
                    reviewDecision === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  ثبت دستور نهایی
                </button>
                <button
                  type="button"
                  onClick={() => setReviewRequest(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
