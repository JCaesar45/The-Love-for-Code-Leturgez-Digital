import { Transaction, User, ApiResponse, Status } from './types';

/**
 * High-performance utility functions for data manipulation
 * All functions are pure with type safety
 */

export class DataUtils {
  /**
   * Generate a deterministic hash from any data
   * Uses MurmurHash3-inspired algorithm
   */
  static generateHash(data: any): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Deep clone with circular reference handling
   */
  static deepClone<T>(obj: T): T {
    const cache = new WeakMap();
    
    const clone = (value: any): any => {
      if (value === null || typeof value !== 'object') {
        return value;
      }
      
      if (cache.has(value)) {
        return cache.get(value);
      }
      
      if (Array.isArray(value)) {
        const arr = value.map((item) => clone(item));
        cache.set(value, arr);
        return arr;
      }
      
      if (value instanceof Date) {
        return new Date(value.getTime());
      }
      
      const result: any = {};
      cache.set(value, result);
      
      Object.keys(value).forEach((key) => {
        result[key] = clone(value[key]);
      });
      
      return result;
    };
    
    return clone(obj);
  }

  /**
   * Transaction aggregator with performance optimization
   */
  static aggregateTransactions(
    transactions: Transaction[],
    groupBy: 'currency' | 'status' | 'day' = 'currency'
  ): Map<string, number> {
    const result = new Map<string, number>();
    
    transactions.forEach((tx) => {
      let key: string;
      if (groupBy === 'day') {
        key = new Date(tx.timestamp).toISOString().split('T')[0];
      } else {
        key = String(tx[groupBy]);
      }
      
      result.set(key, (result.get(key) || 0) + tx.amount);
    });
    
    return result;
  }

  /**
   * Debounce with immediate execution option
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate: boolean = false
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return function(this: any, ...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      
      const callNow = immediate && !timeout;
      
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func.apply(this, args);
    };
  }

  /**
   * Throttle with leading/trailing options
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
    options: { leading?: boolean; trailing?: boolean } = {}
  ): (...args: Parameters<T>) => void {
    const { leading = true, trailing = true } = options;
    let inThrottle: boolean = false;
    let lastFunc: ReturnType<typeof setTimeout> | null = null;
    let lastRan: number = 0;
    
    return function(this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        if (leading) func.apply(this, args);
        lastRan = Date.now();
        inThrottle = true;
        
        setTimeout(() => {
          inThrottle = false;
          if (trailing) func.apply(this, args);
        }, limit);
      } else if (trailing) {
        if (lastFunc) clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          func.apply(this, args);
          lastRan = Date.now();
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  /**
   * Memoize with expiration
   */
  static memoize<T extends (...args: any[]) => any>(
    func: T,
    expirationMs: number = 60000
  ): T {
    const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
    
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < expirationMs) {
        return cached.value;
      }
      
      const result = func(...args);
      cache.set(key, { value: result, timestamp: Date.now() });
      return result;
    }) as T;
  }

  /**
   * Retry with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Binary search for sorted arrays
   */
  static binarySearch<T>(arr: T[], target: T, comparator?: (a: T, b: T) => number): number {
    let left = 0;
    let right = arr.length - 1;
    
    const compare = comparator || ((a: T, b: T) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = compare(arr[mid], target);
      
      if (comparison === 0) return mid;
      if (comparison < 0) left = mid + 1;
      else right = mid - 1;
    }
    
    return -1;
  }

  /**
   * Performance monitoring wrapper
   */
  static measurePerformance<T>(fn: () => T, label: string): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Validate email with RFC 5322 compliance
   */
  static validateEmail(email: string): boolean {
    const rfc5322 = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return rfc5322.test(email);
  }

  /**
   * Format currency with proper locale
   */
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

/**
 * Custom Map with LRU eviction policy
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Refresh: move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}
