import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api/client.ts';
import {
  User,
  UserRole,
  GroupId,
  MemberRank,
  RolePermissions,
  ROLE_LABELS,
  RANK_LABELS,
} from '../types/index.ts';
import {
  UserPlus,
  Search,
  Filter,
  Shield,
  KeyRound,
  UserX,
  UserCheck,
  Award,
  Check,
  X,
} from 'lucide-react';
import { DestructiveConfirmModal } from '../components/DestructiveConfirmModal.tsx';

export const UsersPage: React.FC = () => {
  const { user: currentUser, permissions, activeGroupId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedRank, setSelectedRank] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState<string>(activeGroupId);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRankModal, setShowRankModal] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState<User | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [confirmToggleUser, setConfirmToggleUser] = useState<User | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    phone: '',
    fullName: '',
    role: 'regular_member' as UserRole,
    groupId: 'group_a' as GroupId,
    rank: 5 as MemberRank,
    initialPassword: '',
  });

  const [selectedNewRank, setSelectedNewRank] = useState<MemberRank>(5);
  const [tempPassword, setTempPassword] = useState('');
  const [rolePermissionsMatrix, setRolePermissionsMatrix] = useState<Record<string, RolePermissions> | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedGroup !== 'all') queryParams.append('groupId', selectedGroup);
      if (selectedRole !== 'all') queryParams.append('role', selectedRole);
      if (selectedRank !== 'all') queryParams.append('rank', selectedRank);
      if (selectedStatus !== 'all') queryParams.append('status', selectedStatus);
      if (search) queryParams.append('search', search);

      const res = await api.get<{ users: User[] }>(`/api/users?${queryParams.toString()}`);
      setUsers(res.users);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'خطا در بارگذاری لیست کاربران.' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get<{ permissions: Record<string, RolePermissions> }>('/api/roles/permissions/all');
      setRolePermissionsMatrix(res.permissions);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedGroup, selectedRole, selectedRank, selectedStatus]);

  useEffect(() => {
    setSelectedGroup(activeGroupId);
  }, [activeGroupId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/users', createForm);
      setFeedback({ type: 'success', message: 'کاربر جدید با موفقیت ایجاد گردید.' });
      setShowCreateModal(false);
      setCreateForm({
        phone: '',
        fullName: '',
        role: 'regular_member',
        groupId: 'group_a',
        rank: 5,
        initialPassword: '',
      });
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleUpdateRank = async () => {
    if (!showRankModal) return;
    try {
      await api.patch(`/api/users/${showRankModal.id}/rank`, { rank: selectedNewRank });
      setFeedback({ type: 'success', message: 'رتبه عضویت با موفقیت به‌روزرسانی شد.' });
      setShowRankModal(null);
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleResetPassword = async () => {
    if (!showResetModal) return;
    try {
      await api.post(`/api/users/${showResetModal.id}/reset-password`, { temporaryPassword: tempPassword });
      setFeedback({ type: 'success', message: 'کلمه عبور با موفقیت ریست شد و تغییر آن در ورود اول اجباری گردید.' });
      setShowResetModal(null);
      setTempPassword('');
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmToggleUser) return;
    const newStatus = confirmToggleUser.status === 'active' ? 'disabled' : 'active';
    try {
      await api.patch(`/api/users/${confirmToggleUser.id}`, { status: newStatus });
      setFeedback({
        type: 'success',
        message: `وضعیت کاربر "${confirmToggleUser.fullName}" به ${newStatus === 'active' ? 'فعال' : 'غیرفعال'} تغییر یافت.`,
      });
      setConfirmToggleUser(null);
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSavePermissions = async () => {
    if (!rolePermissionsMatrix) return;
    try {
      await api.put('/api/roles/permissions/all', { rolePermissions: rolePermissionsMatrix });
      setFeedback({ type: 'success', message: 'ماتریس مجوزهای سطوح دسترسی با موفقیت ذخیره شد.' });
      setShowPermissionsModal(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">مدیریت اعضا، رتبه‌ها و سطوح دسترسی</h2>
          <p className="text-xs text-slate-400 mt-1">
            مشاهده، تعریف و ویرایش کاربران دو گروه، انتساب رتبه‌های ۱ تا ۵ و پیکربندی سیاست‌های امنیتی.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === 'super_admin' && (
            <button
              onClick={() => {
                fetchPermissions();
                setShowPermissionsModal(true);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-blue-400" />
              <span>پیکربندی مجوزهای نقش‌ها</span>
            </button>
          )}

          {permissions?.manage_users && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/30 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>ایجاد عضو جدید</span>
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

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو با نام یا شماره تلفن همراه..."
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
            <span>فیلترها:</span>
          </div>

          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">همه گروه‌ها</option>
            <option value="group_a">گروه الف (ذوالفقار)</option>
            <option value="group_b">گروه ب (رعد)</option>
          </select>

          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">همه نقش‌ها</option>
            <option value="super_admin">مدیر ارشد</option>
            <option value="leader">رهبر</option>
            <option value="commander_in_chief">فرمانده کل</option>
            <option value="group_commander">فرمانده گروه</option>
            <option value="group_secretary">منشی گروه</option>
            <option value="regular_member">عضو عادی</option>
          </select>

          <select
            value={selectedRank}
            onChange={e => setSelectedRank(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">همه رتبه‌ها (۱ تا ۵)</option>
            <option value="1">رتبه ۱ (ارشدترین)</option>
            <option value="2">رتبه ۲</option>
            <option value="3">رتبه ۳</option>
            <option value="4">رتبه ۴</option>
            <option value="5">رتبه ۵ (پایه)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="disabled">غیرفعال (مسدود)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3">نام و مشخصات</th>
                <th className="px-4 py-3">شماره تماس</th>
                <th className="px-4 py-3">نقش سازمانی</th>
                <th className="px-4 py-3">گروه</th>
                <th className="px-4 py-3">رتبه عضویت</th>
                <th className="px-4 py-3">امتیاز</th>
                <th className="px-4 py-3">وضعیت</th>
                <th className="px-4 py-3 text-center">عملیات مدیریت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-100 block">{u.fullName}</span>
                    {u.mustChangePassword && (
                      <span className="text-[10px] text-amber-400 block mt-0.5">الزام تغییر رمز اولیه</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-300" dir="ltr">
                    {u.phone}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {ROLE_LABELS[u.role]}
                  </td>
                  <td className="px-4 py-3">
                    {u.groupId === 'group_a' ? (
                      <span className="text-blue-400 font-medium">گروه الف (ذوالفقار)</span>
                    ) : u.groupId === 'group_b' ? (
                      <span className="text-purple-400 font-medium">گروه ب (رعد)</span>
                    ) : (
                      <span className="text-slate-500">سراسری (هر دو گروه)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono tabular-nums font-bold text-slate-200">
                        سطح {u.rank}
                      </span>
                      {permissions?.manage_users && (
                        <button
                          onClick={() => {
                            setSelectedNewRank(u.rank);
                            setShowRankModal(u);
                          }}
                          className="p-1 hover:bg-slate-800 text-blue-400 hover:text-blue-300 rounded transition-colors"
                          title="تغییر رتبه عضو"
                        >
                          <Award className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-emerald-400 font-semibold">
                    {u.pointsBalance}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                        u.status === 'active'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                      }`}
                    >
                      {u.status === 'active' ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {permissions?.manage_users && (
                        <>
                          <button
                            onClick={() => setShowResetModal(u)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                            title="ریست کلمه عبور"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setConfirmToggleUser(u)}
                            disabled={currentUser?.id === u.id}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.status === 'active'
                                ? 'bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300'
                                : 'bg-slate-800 hover:bg-emerald-900/40 text-slate-300 hover:text-emerald-300'
                            }`}
                            title={u.status === 'active' ? 'مسدودسازی کاربر' : 'فعال‌سازی مجدد کاربر'}
                          >
                            {u.status === 'active' ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    هیچ کاربری با مشخصات انتخابی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>تعریف عضو جدید در سامانه</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">شماره تلفن همراه (نام کاربری):</label>
                <input
                  type="text"
                  dir="ltr"
                  value={createForm.phone}
                  onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="09121234567"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="مثال: علیرضا کاوه"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">نقش کاربری:</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="regular_member">عضو عادی</option>
                    <option value="group_secretary">منشی گروه</option>
                    <option value="group_commander">فرمانده گروه</option>
                    {currentUser?.role === 'super_admin' && (
                      <>
                        <option value="leader">رهبر</option>
                        <option value="commander_in_chief">فرمانده کل</option>
                        <option value="super_admin">مدیر ارشد</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">گروه سازمانی:</label>
                  <select
                    value={createForm.groupId}
                    onChange={e => setCreateForm({ ...createForm, groupId: e.target.value as GroupId })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="group_a">گروه الف (ذوالفقار)</option>
                    <option value="group_b">گروه ب (رعد)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">رتبه عضویت (سطوح ۱ تا ۵):</label>
                <select
                  value={createForm.rank}
                  onChange={e => setCreateForm({ ...createForm, rank: Number(e.target.value) as MemberRank })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>رتبه ۱ (سطح یک - ارشدترین)</option>
                  <option value={2}>رتبه ۲ (سطح دو)</option>
                  <option value={3}>رتبه ۳ (سطح سه)</option>
                  <option value={4}>رتبه ۴ (سطح چهار)</option>
                  <option value={5}>رتبه ۵ (سطح پنج - پایه)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">رمز عبور اولیه:</label>
                <input
                  type="password"
                  dir="ltr"
                  value={createForm.initialPassword}
                  onChange={e => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                  placeholder="حداقل ۸ کاراکتر"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                >
                  ایجاد و ثبت در سیستم
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

      {/* Modal: Change Member Rank */}
      {showRankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 text-slate-100">
            <h3 className="font-bold text-sm text-slate-100 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-400" />
              <span>تغییر رتبه عضویت</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              انتساب رتبه برای کاربر: <strong className="text-slate-200">{showRankModal.fullName}</strong>
            </p>

            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedNewRank(r as MemberRank)}
                  className={`w-full text-right px-3 py-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                    selectedNewRank === r
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{RANK_LABELS[r as MemberRank]}</span>
                  {selectedNewRank === r && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={handleUpdateRank}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                ذخیره رتبه جدید
              </button>
              <button
                onClick={() => setShowRankModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 text-slate-100">
            <h3 className="font-bold text-sm text-slate-100 mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>ریست امن کلمه عبور</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              ریست کلمه عبور برای کاربر: <strong className="text-slate-200">{showResetModal.fullName}</strong>. نشست‌های فعال باطل خواهند شد.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                کلمه عبور موقت جدید (حداقل ۸ کاراکتر):
              </label>
              <input
                type="password"
                dir="ltr"
                value={tempPassword}
                onChange={e => setTempPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={handleResetPassword}
                disabled={tempPassword.length < 8}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                ریست و ابطال نشست‌ها
              </button>
              <button
                onClick={() => {
                  setShowResetModal(null);
                  setTempPassword('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Role Permissions Matrix (Super Admin) */}
      {showPermissionsModal && rolePermissionsMatrix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full p-6 text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  ماتریس مجوزهای سطوح دسترسی (Default-Deny Policy)
                </h3>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2 shrink-0">
              بر اساس خط‌مشی امنیتی عدم پذیرش پیش‌فرض، نقش‌های بالاتر تنها در صورت فعال بودن صریح مجوز، به عملیات مربوطه دسترسی خواهند داشت.
            </p>

            <div className="mt-4 overflow-y-auto flex-1 border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">مجوز / عملیات</th>
                    <th className="px-2 py-2.5 text-center">رهبر</th>
                    <th className="px-2 py-2.5 text-center">فرمانده کل</th>
                    <th className="px-2 py-2.5 text-center">فرمانده گروه</th>
                    <th className="px-2 py-2.5 text-center">منشی گروه</th>
                    <th className="px-2 py-2.5 text-center">عضو عادی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {[
                    { key: 'manage_users', label: 'مدیریت و ایجاد اعضا' },
                    { key: 'manage_roles', label: 'تغییر مجوزهای نقش‌ها' },
                    { key: 'view_both_groups', label: 'دسترسی هم‌زمان به هر دو گروه' },
                    { key: 'manage_attendance', label: 'ثبت و اصلاح حضور و غیاب' },
                    { key: 'review_activities', label: 'بررسی و تأیید فعالیت‌ها' },
                    { key: 'manage_notices', label: 'ارسال مأموریت و ابلاغیه' },
                    { key: 'manage_points', label: 'تعدیل امتیازات و بررسی مرخصی' },
                    { key: 'view_audit_logs', label: 'مشاهده گزارش رویدادها (Audit)' },
                    { key: 'manage_backups', label: 'پشتیبان‌گیری و بازیابی داده' },
                  ].map(perm => (
                    <tr key={perm.key} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-medium text-slate-200">{perm.label}</td>
                      {(['leader', 'commander_in_chief', 'group_commander', 'group_secretary', 'regular_member'] as UserRole[]).map(r => (
                        <td key={r} className="px-2 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(rolePermissionsMatrix[r]?.[perm.key as keyof RolePermissions])}
                            onChange={e => {
                              const checked = e.target.checked;
                              setRolePermissionsMatrix(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  [r]: {
                                    ...prev[r],
                                    [perm.key]: checked,
                                  },
                                };
                              });
                            }}
                            className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0">
              <button
                onClick={handleSavePermissions}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                ذخیره ماتریس مجوزها
              </button>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for User Status Toggle */}
      <DestructiveConfirmModal
        isOpen={Boolean(confirmToggleUser)}
        title={confirmToggleUser?.status === 'active' ? 'مسدودسازی حساب کاربر' : 'فعال‌سازی مجدد حساب'}
        message={`آیا از ${confirmToggleUser?.status === 'active' ? 'غیرفعال‌سازی و مسدود کردن' : 'فعال‌سازی مجدد'} حساب کاربری "${confirmToggleUser?.fullName}" اطمینان دارید؟`}
        confirmLabel={confirmToggleUser?.status === 'active' ? 'مسدود شود' : 'فعال شود'}
        isDestructive={confirmToggleUser?.status === 'active'}
        onConfirm={handleToggleStatus}
        onClose={() => setConfirmToggleUser(null)}
      />
    </div>
  );
};
