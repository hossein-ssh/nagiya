import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  BellRing,
  Award,
  ScrollText,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { GroupId } from '../types/index.ts';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, permissions, groups, activeGroupId, setActiveGroupId } = useAuth();

  if (!user) return null;

  const canViewBoth = permissions?.view_both_groups || user.role === 'super_admin';

  const navItems = [
    {
      id: 'dashboard',
      label: 'داشبورد کلی',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'users',
      label: 'مدیریت اعضا و رتبه‌ها',
      icon: Users,
      show: Boolean(permissions?.manage_users),
    },
    {
      id: 'attendance',
      label: 'حضور و غیاب هفتگی',
      icon: CalendarCheck,
      show: true,
    },
    {
      id: 'activities',
      label: 'گزارش و ارزیابی فعالیت‌ها',
      icon: FileText,
      show: true,
    },
    {
      id: 'notices',
      label: 'ابلاغیه‌ها و مأموریت‌ها',
      icon: BellRing,
      show: true,
    },
    {
      id: 'points',
      label: 'دفتر کل امتیازات و مرخصی',
      icon: Award,
      show: true,
    },
    {
      id: 'audit',
      label: 'گزارش رویدادها (Audit)',
      icon: ScrollText,
      show: Boolean(permissions?.view_audit_logs),
    },
    {
      id: 'system',
      label: 'پشتیبان‌گیری و آزمون‌ها',
      icon: ShieldCheck,
      show: Boolean(permissions?.manage_backups || permissions?.view_audit_logs),
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] p-4 select-none">
      {/* Group Scope Selector (if allowed to view both groups) */}
      {canViewBoth ? (
        <div className="mb-6 p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>فیلتر مشاهده گروه‌ها:</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveGroupId('all')}
              className={`py-1 px-1.5 text-[11px] font-medium rounded-lg transition-colors text-center ${
                activeGroupId === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              هر دو گروه
            </button>
            <button
              onClick={() => setActiveGroupId('group_a')}
              className={`py-1 px-1.5 text-[11px] font-medium rounded-lg transition-colors text-center ${
                activeGroupId === 'group_a'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              گروه الف
            </button>
            <button
              onClick={() => setActiveGroupId('group_b')}
              className={`py-1 px-1.5 text-[11px] font-medium rounded-lg transition-colors text-center ${
                activeGroupId === 'group_b'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              گروه ب
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-3 bg-slate-800/60 rounded-xl border border-slate-700/40 text-xs">
          <span className="text-slate-400 block text-[11px]">حوزه سازمانی شما:</span>
          <span className="font-semibold text-slate-200 mt-0.5 block">
            {user.groupId === 'group_a' ? 'گروه الف (ذوالفقار)' : user.groupId === 'group_b' ? 'گروه ب (رعد)' : 'سراسری'}
          </span>
        </div>
      )}

      {/* Navigation menu */}
      <nav className="space-y-1 flex-1">
        {navItems
          .filter(item => item.show)
          .map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-right ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
      </nav>

      {/* Group Quick Info */}
      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex justify-between items-center">
          <span>گروه الف (عملیاتی):</span>
          <span className="text-slate-200 font-mono">ذوالفقار</span>
        </div>
        <div className="flex justify-between items-center">
          <span>گروه ب (پشتیبانی):</span>
          <span className="text-slate-200 font-mono">رعد</span>
        </div>
      </div>
    </aside>
  );
};
