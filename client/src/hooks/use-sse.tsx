import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Create SSE connection
    eventSourceRef.current = new EventSource('/api/events');

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'post_created':
          case 'post_updated':
          case 'post_deleted':
          case 'post_liked':
            // Invalidate posts query to refetch data
            queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('SSE connection error:', error);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return null;
}
