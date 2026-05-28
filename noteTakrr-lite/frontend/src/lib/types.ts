/**
 * Shared TypeScript type definitions for NoteTakrr Lite.
 */

export type ProcessingMode = 'summary' | 'reviewer';

export interface Conversation {
  id: string;
  title: string;
  mode: ProcessingMode;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: ProcessingMode;
  has_docx: boolean;
  created_at: string;
}

export interface ProcessResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  mode: ProcessingMode;
  has_docx: boolean;
}

export interface HealthResponse {
  status: string;
}
