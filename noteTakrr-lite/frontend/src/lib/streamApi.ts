/**
 * streamApi — Helper for consuming Server-Sent Events (SSE) from the backend.
 * 
 * Used by useAgent to stream AI responses token-by-token.
 */

import { supabase } from './supabase';

export interface StreamCallbacks {
  onMeta: (data: { conversation_id: string }) => void;
  onToken: (token: string) => void;
  onDone: (data: { message_id: string; has_docx: boolean }) => void;
  onError: (detail: string) => void;
}

/**
 * POST to an endpoint and consume the SSE stream.
 * Works for both /process (FormData) and /chat (JSON).
 */
export async function streamRequest(
  url: string,
  body: FormData | Record<string, unknown>,
  callbacks: StreamCallbacks,
) {
  // Get the auth token from Supabase (same source as the Axios interceptor)
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || '';
  
  const isFormData = body instanceof FormData;
  
  const response = await fetch(`http://localhost:8000/api${url}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: isFormData ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.detail || `HTTP ${response.status}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('HTTP')) throw e;
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Parse SSE events from the buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete last line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6);
        try {
          const event = JSON.parse(jsonStr);
          
          switch (event.type) {
            case 'meta':
              callbacks.onMeta(event);
              break;
            case 'token':
              callbacks.onToken(event.content);
              break;
            case 'done':
              callbacks.onDone(event);
              break;
            case 'error':
              callbacks.onError(event.detail);
              break;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }
}
