import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Status, ApiResponse, User, Transaction, AnalyticsMetrics } from './types';
import { DataUtils, LRUCache } from './utils';

// Custom hook for API calls with caching
export function useApi<T>(
  endpoint: string,
  options: RequestInit = {},
  cacheDuration: number = 30000
) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new LRUCache<string, { data: T; timestamp: number }>(50));

  const fetchData = useCallback(async () => {
    const cacheKey = `${endpoint}:${JSON.stringify(options.body || {})}`;
    
    // Check cache
    const cached = cache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      setData(cached.data);
      setStatus('success');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<T> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      const data = result.data as T;
      setData(data);
      setStatus('success');
      
      // Update cache
      cache.current.set(cacheKey, { data, timestamp: Date.now() });
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      setError(message);
      setStatus('error');
      console.error('API Error:', err);
    }
  }, [endpoint, options, cacheDuration]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, status, error, refetch: fetchData };
}

// Hook for real-time WebSocket data
export function useWebSocket<T>(
  url: string,
  streamType: string = 'default'
) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000;

    const connect = () => {
      try {
        ws.current = new WebSocket(`ws://localhost:5000${url}`);
        setStatus('loading');

        ws.current.onopen = () => {
          console.log('WebSocket connected');
          setStatus('success');
          // Subscribe to stream
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ 
              type: 'subscribe', 
              stream: streamType 
            }));
          }
        };

        ws.current.onmessage = (event) => {
         
