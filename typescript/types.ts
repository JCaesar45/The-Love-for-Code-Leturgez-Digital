// Domain types with strict TypeScript safety
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  cacheKey?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  active: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'BTC' | 'ETH';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  timestamp: Date;
  hash: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsMetrics {
  activeUsers: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  timestamp: string;
}

export interface DashboardData extends AnalyticsMetrics {
  totalRequests: number;
  activeSessions: number;
  topEndpoints: string[];
}

// Utility types
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type OmitTimestamps<T> = Omit<T, 'createdAt' | 'updatedAt'>;

export type Nullable<T> = T | null;

export type AsyncFunction<T, U> = (arg: T) => Promise<U>;

// State management types
export interface StoreState {
  user: User | null;
  transactions: Transaction[];
  analytics: AnalyticsMetrics | null;
  status: Status;
  error: string | null;
}

export type StoreAction<T = any> = {
  type: string;
  payload?: T;
};

export type StoreReducer<S> = (state: S, action: StoreAction) => S;

// API types
export interface APIEndpoints {
  health: '/api/health';
  processData: '/api/data/process';
  getCache: '/api/data/cache/:key';
  analytics: '/api/analytics/realtime';
  dashboard: '/api/analytics/dashboard';
}

export type EndpointParams = {
  [K in keyof APIEndpoints]: APIEndpoints[K] extends `${string}:${infer Param}`
    ? { [P in Param]: string }
    : Record<string, never>;
};
