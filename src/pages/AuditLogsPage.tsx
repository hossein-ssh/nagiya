import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api/client.ts';
import { AuditLogEntry, ROLE_LABELS } from '../types/index.ts';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { user: currentUser, activeGroupId } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(targetPage));
      queryParams.append('limit', '30');
      if (category !== 'all') queryParams.append('category', category);
      if (activeGroupId !== 'all') queryParams.append('groupId', activeGroupId);
      if (search) queryParams.append('search', search);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await api.get<{
        logs: AuditLogEntry[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/api/audit?${queryParams.toString()}`);

      setLogs(res.logs);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [category, activeGroupId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'auth':
        return 'bg-blue-950 text-blue-400 border border-blue-800';
      case 'users':
        return 'bg-purple-950 text-purple-400 border border-purple-800';
      case 'roles':
        return 'bg-amber-950 text-amber-400 border border-amber-800';
      case 'attendance':
        return 'bg-emerald-950 text-emerald-400 border border-emerald-800';
      case 'activities':
        return 'bg-cyan-950 text-cyan-400 border border-cyan-800';
      case 'points':
        return 'bg-yellow-950 text-yellow-400 border border-yellow-800';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">دفتر کل ثبت رویدادها و لاگ‌های امنیتی (Audit Log)</h2>
          <p className="text-xs text-slate-400 mt-1">
            ردیابی تغییرات مدیریتی، لاگین‌ها، صدور احکام، انتساب رتبه‌ها و جابجایی امتیازات بر اساس ضوابط امنیت و شفافیت.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(page)}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
          <span>تازه‌سازی لاگ‌ها</span>
        </button>
      </div>

      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو در شرح رویداد، نوع اقدام یا شماره تماس کاربر..."
              className="w-full pl-3 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            جستجو
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>دسته‌بندی:</span>
          </div>

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">همه دسته‌ها</option>
            <option value="auth">احراز هویت و ورود/خروج</option>
            <option value="users">مدیریت کاربران و رتبه‌ها</option>
            <option value="roles">پیکربندی سطوح دسترسی</option>
            <option value="attendance">حضور و غیاب و اصلاحات</option>
            <option value="activities">گزارشات و ارزیابی فعالیت‌ها</option>
            <option value="points">دفتر کل امتیازات و مرخصی</option>
            <option value="notices">ابلاغیه‌ها و مأموریت‌ها</option>
            <option value="system">پشتیبان‌گیری و سیستم</option>
          </select>

          <div className="flex items-center gap-2 mr-auto">
            <span className="text-slate-400">از تاریخ:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-xs"
            />
            <span className="text-slate-400">تا تاریخ:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">زمان ثبت</th>
                <th className="px-4 py-3">کاربر عامل</th>
                <th className="px-4 py-3">نقش</th>
                <th className="px-4 py-3">عنوان اقدام</th>
                <th className="px-4 py-3">دسته‌بندی</th>
                <th className="px-4 py-3">شرح جزئیات رویداد</th>
                <th className="px-4 py-3">آدرس IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-400 text-[11px]" dir="ltr">
                    {new Date(log.timestamp).toLocaleString('fa-IR')}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-200 font-medium" dir="ltr">
                    {log.actorPhone}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px]">
                    {ROLE_LABELS[log.actorRole] || log.actorRole}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-blue-400 font-semibold">
                    {log.action}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${getCategoryBadge(log.category)}`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200 max-w-md leading-relaxed">
                    {log.details}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-500 text-[11px]" dir="ltr">
                    {log.ipAddress || '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    هیچ رکوردی در بازه انتخابی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              نمایش صفحه {page} از {totalPages} (مجموع {total} رکورد لاگ)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => fetchLogs(page - 1)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchLogs(page + 1)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
