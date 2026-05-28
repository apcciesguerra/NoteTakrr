import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { streamRequest } from '../lib/streamApi';

export function useAgent() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const refetchAll = async (conversationId?: string) => {
    await queryClient.refetchQueries({ queryKey: ['conversations'] });
    if (conversationId) {
      await queryClient.refetchQueries({ queryKey: ['messages', conversationId] });
    }
  };

  /**
   * Upload files and stream the AI response token-by-token.
   * Returns the conversation_id so ChatWindow can select it.
   */
  const processNotes = useCallback(async ({
    files,
    mode,
    include_search,
    conversation_id,
  }: {
    files: File[];
    mode: 'summary' | 'reviewer';
    include_search: boolean;
    conversation_id?: string;
  }) => {
    setIsProcessing(true);
    setStreamingContent('');

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('mode', mode);
    formData.append('include_search', String(include_search));
    if (conversation_id) formData.append('conversation_id', conversation_id);

    let resultConversationId = conversation_id || '';

    try {
      await streamRequest('/process', formData, {
        onMeta: (data) => {
          resultConversationId = data.conversation_id;
        },
        onToken: (token) => {
          setStreamingContent((prev) => prev + token);
        },
        onDone: async () => {
          // Refetch FIRST so DB messages load, THEN clear streaming
          await refetchAll(resultConversationId);
          setStreamingContent('');
          setIsProcessing(false);
        },
        onError: (detail) => {
          setIsProcessing(false);
          setStreamingContent('');
          alert(`Error: ${detail}`);
        },
      });
    } catch (error: any) {
      setIsProcessing(false);
      setStreamingContent('');
      throw error;
    }

    return { conversation_id: resultConversationId };
  }, [queryClient]);

  /**
   * Send a text-only chat message and stream the response.
   */
  const sendMessage = useCallback(async ({
    message,
    mode,
    include_search,
    conversation_id,
  }: {
    message: string;
    mode: 'summary' | 'reviewer';
    include_search: boolean;
    conversation_id?: string;
  }) => {
    setIsProcessing(true);
    setStreamingContent('');

    let resultConversationId = conversation_id || '';

    try {
      await streamRequest('/chat', {
        message,
        mode,
        include_search,
        conversation_id,
      }, {
        onMeta: (data) => {
          resultConversationId = data.conversation_id;
        },
        onToken: (token) => {
          setStreamingContent((prev) => prev + token);
        },
        onDone: async () => {
          // Refetch FIRST so DB messages load, THEN clear streaming
          await refetchAll(resultConversationId);
          setStreamingContent('');
          setIsProcessing(false);
        },
        onError: (detail) => {
          setIsProcessing(false);
          setStreamingContent('');
          alert(`Error: ${detail}`);
        },
      });
    } catch (error: any) {
      setIsProcessing(false);
      setStreamingContent('');
      throw error;
    }

    return { conversation_id: resultConversationId };
  }, [queryClient]);

  return {
    processNotes,
    sendMessage,
    isProcessing,
    streamingContent,
  };
}

export default useAgent;
