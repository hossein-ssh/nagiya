export type UserRole =
  | 'super_admin'
  | 'leader'
  | 'commander_in_chief'
  | 'group_commander'
  | 'group_secretary'
  | 'regular_member';

export type GroupId = 'group_a' | 'group_b';

export type MemberRank = 1 | 2 | 3 | 4 | 5;

export type UserStatus = 'active' | 'disabled';

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  groupId: GroupId | null; // null for super_admin, leader, commander_in_chief
  rank: MemberRank; // 1 (highest) to 5 (lowest)
  status: UserStatus;
  passwordHash: string;
  passwordSalt: string;
  mustChangePassword: boolean;
  pointsBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermissions {
  manage_users: boolean;
  manage_roles: boolean;
  view_both_groups: boolean;
  manage_attendance: boolean;
  review_activities: boolean;
  manage_notices: boolean;
  manage_points: boolean;
  view_audit_logs: boolean;
  manage_backups: boolean;
}

export interface Group {
  id: GroupId;
  name: string;
  codeName: string;
  description: string;
  commanderId: string | null;
  secretaryId: string | null;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'mission';

export interface AttendanceRecord {
  id: string;
  groupId: GroupId;
  userId: string;
  date: string; // YYYY-MM-DD
  weekNumber: number;
  status: AttendanceStatus;
  note?: string;
  recordedByUserId: string;
  createdAt: string;
  updatedAt: string;
  correctionLog?: {
    previousStatus: AttendanceStatus;
    newStatus: AttendanceStatus;
    reason: string;
    correctedByUserId: string;
    correctedAt: string;
  }[];
}

export type ActivityStatus = 'pending' | 'approved' | 'rejected';

export interface ActivityReport {
  id: string;
  groupId: GroupId;
  userId: string;
  title: string;
  description: string;
  category: string;
  hoursSpent: number;
  imageFileName?: string;
  status: ActivityStatus;
  awardedPoints?: number;
  reviewerId?: string;
  reviewerComment?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  submittedAt: string;
}

export type NoticeType = 'task_mission' | 'warning' | 'reward' | 'leave' | 'announcement';

export interface Notice {
  id: string;
  targetGroupId: GroupId | 'all';
  targetUserId?: string; // specific user or all members in group
  type: NoticeType;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdByUserId: string;
  createdAt: string;
  readByUserIds: string[];
}

export interface PointTransaction {
  id: string;
  userId: string;
  groupId: GroupId;
  amount: number; // positive or negative
  balanceAfter: number;
  reason: string;
  category: 'activity_reward' | 'manual_adjustment' | 'spending_leave' | 'penalty';
  referenceId?: string; // e.g. activity ID or spending request ID
  createdByUserId: string;
  createdAt: string;
}

export type SpendingRequestStatus = 'pending' | 'approved' | 'rejected';

export interface PointSpendingRequest {
  id: string;
  userId: string;
  groupId: GroupId;
  pointsCost: number;
  purpose: string; // e.g. "درخواست مرخصی با امتیاز"
  status: SpendingRequestStatus;
  reviewedByUserId?: string;
  reviewComment?: string;
  requestedAt: string;
  reviewedAt?: string;
}

export interface ScoringRule {
  id: string;
  name: string;
  category: string;
  defaultPoints: number;
  description: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorPhone: string;
  actorRole: UserRole;
  action: string;
  category: 'auth' | 'users' | 'roles' | 'attendance' | 'activities' | 'points' | 'notices' | 'system';
  targetGroupId?: GroupId | null;
  targetUserId?: string | null;
  details: string;
  ipAddress?: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface DatabaseSchema {
  version: number;
  users: User[];
  groups: Group[];
  rolePermissions: Record<UserRole, RolePermissions>;
  attendance: AttendanceRecord[];
  activities: ActivityReport[];
  notices: Notice[];
  pointTransactions: PointTransaction[];
  spendingRequests: PointSpendingRequest[];
  scoringRules: ScoringRule[];
  auditLogs: AuditLogEntry[];
  sessions: Session[];
}
