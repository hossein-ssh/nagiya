import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api/client.ts';
import {
  AttendanceRecord,
  AttendanceStatus,
  GroupId,
  User,
  RANK_LABELS,
} from '../types/index.ts';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  Save,
  History,
  Edit3,
  X,
  AlertCircle,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user: currentUser, permissions, activeGroupId } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<GroupId>(
    currentUser?.groupId || (activeGroupId !== 'all' ? (activeGroupId as GroupId) : 'group_a')
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [weekNumber, setWeekNumber] = useState<number>(43);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [memberStatuses, setMemberStatuses] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Correction Modal
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null);
  const [correctionNewStatus, setCorrectionNewStatus] = useState<AttendanceStatus>('present');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionNote, setCorrectionNote] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, attendanceRes] = await Promise.all([
        api.get<{ users: User[] }>(`/api/users?groupId=${selectedGroup}`),
        api.get<{ records: AttendanceRecord[] }>(`/api/attendance?groupId=${selectedGroup}&date=${date}`),
      ]);

      setGroupMembers(membersRes.users);
      setRecords(attendanceRes.records);

      const statusMap: Record<string, { status: AttendanceStatus; note: string }> = {};
      membersRes.users.forEach(m => {
        const found = attendanceRes.records.find(r => r.userId === m.id);
        if (found) {
          statusMap[m.id] = { status: found.status, note: found.note || '' };
        } else {
          statusMap[m.id] = { status: 'present', note: '' };
        }
      });
      setMemberStatuses(statusMap);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در دریافت اطلاعات حضور و غیاب.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGroup, date]);

  const handleStatusChange = (userId: string, status: AttendanceStatus) => {
    setMemberStatuses(prev => ({
      ...prev,
      [userId]: { ...prev[userId], status },
    }));
  };

  const handleNoteChange = (userId: string, note: string) => {
    setMemberStatuses(prev => ({
      ...prev,
      [userId]: { ...prev[userId], note },
    }));
  };

  const handleSaveBatch = async () => {
    try {
      const entries = Object.entries(memberStatuses).map(([userId, val]) => ({
        userId,
        status: val.status,
        note: val.note,
      }));

      await api.post('/api/attendance/batch', {
        groupId: selectedGroup,
        date,
        weekNumber,
        entries,
      });

      setFeedback({ type: 'success', message: 'حضور و غیاب با موفقیت ثبت و ذخیره گردید.' });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionRecord) return;
    if (!correctionReason.trim()) {
      setFeedback({ type: 'error', message: 'ذکر علت تصحیح حضور و غیاب الزامی است.' });
      return;
    }

    try {
      await api.patch(`/api/attendance/${correctionRecord.id}`, {
        status: correctionNewStatus,
        note: correctionNote,
        correctionReason: correctionReason.trim(),
      });
      setFeedback({ type: 'success', message: 'وضعیت با موفقیت تصحیح و ثبت شد.' });
      setCorrectionRecord(null);
      setCorrectionReason('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const canManage = Boolean(permissions?.manage_attendance);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">سامانه ثبت و پایش حضور و غیاب هفتگی</h2>
          <p className="text-xs text-slate-400 mt-1">
            ثبت انضباطی حضور، غیبت، مرخصی و مأموریت اعضا همراه با ثبت تاریخچه و علت تصحیحات مجاز.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleSaveBatch}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/30 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره نهایی حضور و غیاب</span>
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

      {/* Date & Group Control Strip */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-4 text-xs">
        {/* Group Selector */}
        {(currentUser?.role === 'super_admin' || permissions?.view_both_groups) && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">انتخاب گروه:</span>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value as GroupId)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="group_a">گروه الف (ذوالفقار)</option>
              <option value="group_b">گروه ب (رعد)</option>
            </select>
          </div>
        )}

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">تاریخ جلسه:</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Week Number */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">شماره هفته سال:</span>
          <input
            type="number"
            min={1}
            max={53}
            value={weekNumber}
            onChange={e => setWeekNumber(Number(e.target.value))}
            className="w-16 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono text-center focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">نام عضو</th>
                <th className="px-4 py-3">رتبه</th>
                <th className="px-4 py-3">شماره تماس</th>
                <th className="px-4 py-3 text-center">وضعیت حضور در جلسه</th>
                <th className="px-4 py-3">توضیحات و انضباطی</th>
                <th className="px-4 py-3 text-center">تاریخچه تصحیح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {groupMembers.map(member => {
                const currentStatus = memberStatuses[member.id]?.status || 'present';
                const currentNote = memberStatuses[member.id]?.note || '';
                const savedRecord = records.find(r => r.userId === member.id);

                return (
                  <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-100">
                      {member.fullName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono tabular-nums text-slate-400">سطح {member.rank}</span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-400" dir="ltr">
                      {member.phone}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => handleStatusChange(member.id, 'present')}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                            currentStatus === 'present'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>حاضر</span>
                        </button>

                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => handleStatusChange(member.id, 'absent')}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                            currentStatus === 'absent'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <XCircle className="w-3 h-3" />
                          <span>غایب</span>
                        </button>

                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => handleStatusChange(member.id, 'leave')}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                            currentStatus === 'leave'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>مرخصی</span>
                        </button>

                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => handleStatusChange(member.id, 'mission')}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                            currentStatus === 'mission'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <Compass className="w-3 h-3" />
                          <span>مأموریت</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        disabled={!canManage}
                        value={currentNote}
                        onChange={e => handleNoteChange(member.id, e.target.value)}
                        placeholder="توضیح انضباطی یا علت غیبت..."
                        className="w-full px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {savedRecord?.correctionLog && savedRecord.correctionLog.length > 0 ? (
                        <button
                          onClick={() => {
                            setCorrectionRecord(savedRecord);
                            setCorrectionNewStatus(savedRecord.status);
                            setCorrectionNote(savedRecord.note || '');
                          }}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10px] inline-flex items-center gap-1 font-mono tabular-nums"
                          title="مشاهده و ثبت تصحیح مجاز"
                        >
                          <History className="w-3 h-3" />
                          <span>{savedRecord.correctionLog.length} بار اصلاح</span>
                        </button>
                      ) : savedRecord ? (
                        canManage && (
                          <button
                            onClick={() => {
                              setCorrectionRecord(savedRecord);
                              setCorrectionNewStatus(savedRecord.status);
                              setCorrectionNote(savedRecord.note || '');
                            }}
                            className="p-1 text-slate-400 hover:text-blue-400 rounded transition-colors"
                            title="ثبت تصحیح رسمی"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {groupMembers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    هیچ عضوی در این گروه ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Authorized Attendance Correction */}
      {correctionRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>تصحیح انضباطی و رسمی رکورد حضور و غیاب</span>
              </h3>
              <button onClick={() => setCorrectionRecord(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">عضو:</span>
                <span className="font-semibold text-slate-200 block">
                  {correctionRecord.userFullName || 'عضو گروه'} (تاریخ {correctionRecord.date})
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">وضعیت جدید:</label>
                <select
                  value={correctionNewStatus}
                  onChange={e => setCorrectionNewStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="present">حاضر</option>
                  <option value="absent">غایب</option>
                  <option value="leave">مرخصی</option>
                  <option value="mission">مأموریت</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  علت تغییر و اصلاح وضعیت (الزامی جهت حسابرسی):
                </label>
                <textarea
                  rows={2}
                  required
                  value={correctionReason}
                  onChange={e => setCorrectionReason(e.target.value)}
                  placeholder="مثال: ارائه برگه مأموریت اداری مصوب یا تصحیح اشتباه منشی جلسه..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {correctionRecord.correctionLog && correctionRecord.correctionLog.length > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg max-h-36 overflow-y-auto">
                  <span className="font-semibold text-[11px] text-slate-400 block mb-1">
                    سوابق قبلی اصلاحات:
                  </span>
                  <div className="space-y-1.5 text-[10px] text-slate-400">
                    {correctionRecord.correctionLog.map((log, idx) => (
                      <div key={idx} className="pb-1 border-b border-slate-800 last:border-none">
                        <span className="text-slate-300">
                          از {log.previousStatus} به {log.newStatus}
                        </span>
                        <span className="block text-slate-500">علت: {log.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                >
                  ثبت رسمی تصحیح
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectionRecord(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
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
