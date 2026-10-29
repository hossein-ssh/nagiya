import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ROLE_LABELS, RANK_LABELS } from '../types/index.ts';
import { LogOut, UserCircle2 } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onChangePasswordClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onChangePasswordClick }) => {
  const { user, logout, permissions } = useAuth();

  if (!user) return null;

  return (
    <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-8 shrink-0 select-none sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            onSelectTab('dashboard');
          }}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-blue-400 transition-colors"
        >
          سامانه مدیریت اعضا و گروه‌ها
        </a>
      </div>

      {/* Zone 2: Concise single-line navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            currentTab === 'dashboard' ? 'text-white border-b-2 border-blue-500 font-bold' : ''
          }`}
        >
          داشبورد عملیاتی
        </button>

        {permissions?.manage_users && (
          <button
            onClick={() => onSelectTab('users')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              currentTab === 'users' ? 'text-white border-b-2 border-blue-500 font-bold' : ''
            }`}
          >
            اعضا و رتبه‌بندی
          </button>
        )}

        <button
          onClick={() => onSelectTab('attendance')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            currentTab === 'attendance' ? 'text-white border-b-2 border-blue-500 font-bold' : ''
          }`}
        >
          حضور و غیاب هفتگی
        </button>

        <button
          onClick={() => onSelectTab('activities')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            currentTab === 'activities' ? 'text-white border-b-2 border-blue-500 font-bold' : ''
          }`}
        >
          گزارش و ارزیابی فعالیت‌ها
        </button>

        <button
          onClick={() => onSelectTab('notices')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            currentTab === 'notices' ? 'text-white border-b-2 border-blue-500 font-bold' : ''
          }`}
        >
          مأموریت‌ها و ابلاغیه‌ها
        </button>

        <button
          onClick={() => onSelectTab('points')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            currentTab === 'points' ? 'text-white border-b-2 border-blue-500 font-bold' : ''
          }`}
        >
          دفتر امتیازات و مرخصی
        </button>

        {permissions?.view_audit_logs && (
          <button
            onClick={() => onSelectTab('audit')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              currentTab === 'audit' ? 'text-white border-b-2 border-blue-500 font-bold' : ''
            }`}
          >
            گزارش رویدادها
          </button>
        )}
      </nav>

      {/* Zone 3: Account & Session Action */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex flex-col text-left text-xs">
          <div className="flex items-center gap-2 justify-end">
            <span className="font-semibold text-slate-200">{user.fullName}</span>
            <span className="text-[10px] text-blue-400 font-medium">({ROLE_LABELS[user.role]})</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 justify-end">
            <span>{RANK_LABELS[user.rank]}</span>
            <span>·</span>
            <span className="font-mono tabular-nums text-emerald-400 font-medium">{user.pointsBalance} امتیاز</span>
          </div>
        </div>

        <button
          onClick={onChangePasswordClick}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="تغییر رمز عبور"
        >
          <UserCircle2 className="w-5 h-5" />
        </button>

        <button
          onClick={() => logout()}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          title="خروج از سامانه"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">خروج</span>
        </button>
      </div>
    </header>
  );
};
