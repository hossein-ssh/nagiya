import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api/client.ts';
import { User, ActivityReport, Notice, AttendanceRecord, ROLE_LABELS, RANK_LABELS } from '../types/index.ts';
import {
  Users,
  CalendarCheck,
  FileCheck2,
  Award,
  BellRing,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, permissions, activeGroupId, setActiveGroupId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<ActivityReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, actRes, notRes, attRes] = await Promise.allSettled([
          api.get<{ users: User[] }>(`/api/users?groupId=${activeGroupId}`),
          api.get<{ activities: ActivityReport[] }>(`/api/activities?groupId=${activeGroupId}`),
          api.get<{ notices: Notice[] }>('/api/notices'),
          api.get<{ records: AttendanceRecord[] }>(`/api/attendance?groupId=${activeGroupId}`),
        ]);

        if (usersRes.status === 'fulfilled') setUsers(usersRes.value.users);
        if (actRes.status === 'fulfilled') setActivities(actRes.value.activities);
        if (notRes.status === 'fulfilled') setNotices(notRes.value.notices);
        if (attRes.status === 'fulfilled') setAttendance(attRes.value.records);
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [activeGroupId]);

  if (!user) return null;

  const isSuperAdminOrLeader =
    user.role === 'super_admin' || user.role === 'leader' || user.role === 'commander_in_chief';

  const groupAUsers = users.filter(u => u.groupId === 'group_a');
  const groupBUsers = users.filter(u => u.groupId === 'group_b');
  const pendingActivities = activities.filter(a => a.status === 'pending');
  const myActivities = activities.filter(a => a.userId === user.id);
  const myAttendance = attendance.filter(a => a.userId === user.id);
  const unreadNotices = notices.filter(n => !n.isRead);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>{ROLE_LABELS[user.role]}</span>
            <span>·</span>
            <span>{RANK_LABELS[user.rank]}</span>
            {user.groupId && (
              <>
                <span>·</span>
                <span>{user.groupId === 'group_a' ? 'گروه الف (ذوالفقار)' : 'گروه ب (رعد)'}</span>
              </>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            خوش آمدید، {user.fullName}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {isSuperAdminOrLeader
              ? 'سامانه مدیریت و نظارت بر دو گروه مستقل الف و ب با قابلیت کنترل دقیق دسترسی‌ها و ثبت لاگ.'
              : user.role === 'group_commander' || user.role === 'group_secretary'
              ? 'کارتابل اختصاصی مدیریت گروه سازمانی. داده‌های گروه دیگر برای حفظ امنیت تفکیک شده‌اند.'
              : 'کارتابل فردی اعضا جهت ثبت فعالیت‌ها، مشاهده امتیازات و سوابق حضور.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 text-center">
            <span className="text-[11px] text-slate-400 block">امتیاز شما</span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-400">
              {user.pointsBalance}
            </span>
          </div>

          <button
            onClick={() => onNavigate('activities')}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/30 whitespace-nowrap"
          >
            {user.role === 'regular_member' ? 'ثبت گزارش جدید' : 'بررسی کارتابل'}
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">
              {isSuperAdminOrLeader ? 'مجموع کل اعضا' : 'اعضای گروه شما'}
            </span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
            {users.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {groupAUsers.length} نفر در گروه الف · {groupBUsers.length} نفر در گروه ب
          </span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">فعالیت‌های در انتظار بررسی</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
            {pendingActivities.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            نیاز به ارزیابی توسط فرماندهان
          </span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">سوابق حضور ثبت‌شده</span>
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
            {attendance.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            جلسات هفتگی و مأموریت‌ها
          </span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">ابلاغیه‌ها و مأموریت‌ها</span>
            <BellRing className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
            {notices.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {unreadNotices.length} پیام خوانده نشده
          </span>
        </div>
      </div>

      {/* Two Groups Comparison & Isolation Preview (for High Command) */}
      {isSuperAdminOrLeader && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Group A Card */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-100">گروه الف (ذوالفقار)</h3>
                <span className="text-[11px] text-slate-400">واحد عملیاتی و تاکتیکی</span>
              </div>
              <button
                onClick={() => {
                  setActiveGroupId('group_a');
                  onNavigate('users');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <span>مشاهده اعضا</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">تعداد نیروها:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-200">
                  {groupAUsers.length} نفر
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">فرمانده گروه:</span>
                <span className="text-slate-200">رضا کمالی (رتبه ۲)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">منشی گروه:</span>
                <span className="text-slate-200">مهدی نجفی (رتبه ۳)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">فعالیت‌های ثبت‌شده:</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {activities.filter(a => a.groupId === 'group_a').length} گزارش
                </span>
              </div>
            </div>
          </div>

          {/* Group B Card */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-100">گروه ب (رعد)</h3>
                <span className="text-[11px] text-slate-400">واحد پشتیبانی و تخصصی</span>
              </div>
              <button
                onClick={() => {
                  setActiveGroupId('group_b');
                  onNavigate('users');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <span>مشاهده اعضا</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">تعداد نیروها:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-200">
                  {groupBUsers.length} نفر
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">فرمانده گروه:</span>
                <span className="text-slate-200">سجاد کاظمی (رتبه ۲)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">منشی گروه:</span>
                <span className="text-slate-200">محمود باقری (رتبه ۳)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">فعالیت‌های ثبت‌شده:</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {activities.filter(a => a.groupId === 'group_b').length} گزارش
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activities and Announcements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Submissions */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-slate-100">آخرین فعالیت‌های ثبت‌شده</h3>
            <button
              onClick={() => onNavigate('activities')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              مشاهده همه
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {activities.slice(0, 4).map(act => (
              <div
                key={act.id}
                className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-start justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{act.title}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span>{act.submitterName || 'عضو'}</span>
                    <span>·</span>
                    <span>{act.category}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{act.hoursSpent} ساعت</span>
                  </div>
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
                    {act.status === 'approved' ? 'تأیید شده' : act.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}
                  </span>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">هیچ گزارشی برای نمایش وجود ندارد.</p>
            )}
          </div>
        </div>

        {/* Recent Notices */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-slate-100">مأموریت‌ها و ابلاغیه‌ها</h3>
            <button
              onClick={() => onNavigate('notices')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              مشاهده همه
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {notices.slice(0, 4).map(not => (
              <div
                key={not.id}
                className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-start justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{not.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{not.content}</p>
                </div>
                <div className="text-[10px] text-slate-400 shrink-0 font-medium">
                  {not.priority === 'urgent' && <span className="text-rose-400 font-bold">فوری</span>}
                  {not.priority === 'high' && <span className="text-amber-400">مهم</span>}
                  {not.priority === 'medium' && <span className="text-blue-400">عادی</span>}
                </div>
              </div>
            ))}
            {notices.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">هیچ ابلاغیه‌ای موجود نیست.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
