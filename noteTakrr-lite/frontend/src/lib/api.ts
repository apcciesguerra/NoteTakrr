/**
 * API client for communicating with the NoteTakrr Lite backend.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// TODO: Add API methods:
// - processNotes(file: File, mode: string, conversationId?: string)
// - getConversations()
// - getMessages(conversationId: string)
// - downloadDocx(messageId: string)
