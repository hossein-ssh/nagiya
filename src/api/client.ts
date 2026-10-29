const TOKEN_KEY = 'group_mgmt_auth_token';

export class ApiError extends Error {
  status: number;
  code?: string;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, code?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const api = {
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
  },

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const errMsg = (typeof data === 'object' && data?.error) || 'خطایی در ارتباط با سرور رخ داد.';
      const errCode = typeof data === 'object' ? data?.code : undefined;
      const retryAfter = typeof data === 'object' ? data?.retryAfterSeconds : undefined;

      if (res.status === 401 && !endpoint.includes('/api/auth/login')) {
        this.clearToken();
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }

      throw new ApiError(errMsg, res.status, errCode, retryAfter);
    }

    return data as T;
  },

  get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  },

  post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  },
};
