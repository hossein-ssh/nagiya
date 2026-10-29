import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RolePermissions, Group, GroupId } from '../types/index.ts';
import { api } from '../api/client.ts';

interface AuthContextType {
  user: User | null;
  permissions: RolePermissions | null;
  groups: Group[];
  activeGroupId: GroupId | 'all';
  setActiveGroupId: (id: GroupId | 'all') => void;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<GroupId | 'all'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const token = api.getToken();
      if (!token) {
        setUser(null);
        setPermissions(null);
        setIsLoading(false);
        return;
      }
      const data = await api.get<{ user: User; permissions: RolePermissions; groups: Group[] }>('/api/auth/me');
      setUser(data.user);
      setPermissions(data.permissions);
      setGroups(data.groups);

      // Auto-set active group if user belongs to single group
      if (data.user.groupId) {
        setActiveGroupId(data.user.groupId);
      } else {
        setActiveGroupId('all');
      }
    } catch (err) {
      console.warn('Failed to fetch current user session:', err);
      api.clearToken();
      setUser(null);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleExpired = () => {
      setUser(null);
      setPermissions(null);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (phone: string, password: string) => {
    const data = await api.post<{
      token: string;
      user: User;
      permissions: RolePermissions;
      groups: Group[];
    }>('/api/auth/login', { phone, password });

    api.setToken(data.token);
    setUser(data.user);
    setPermissions(data.permissions);
    setGroups(data.groups);

    if (data.user.groupId) {
      setActiveGroupId(data.user.groupId);
    } else {
      setActiveGroupId('all');
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      api.clearToken();
      setUser(null);
      setPermissions(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        groups,
        activeGroupId,
        setActiveGroupId,
        isLoading,
        login,
        logout,
        refreshUser,
        mustChangePassword: Boolean(user?.mustChangePassword),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
