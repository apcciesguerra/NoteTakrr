import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface ProcessRequest {
  file: File;
  mode: 'summary' | 'reviewer';
  include_search: boolean;
  conversation_id?: string;
}

interface ChatRequest {
  message: string;
  mode: 'summary' | 'reviewer';
  include_search: boolean;
  conversation_id?: string;
}

export function useAgent() {
  const queryClient = useQueryClient();

  // Mutation for file uploads (existing)
  const processMutation = useMutation({
    mutationFn: async ({ file, mode, include_search, conversation_id }: ProcessRequest) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      formData.append('include_search', String(include_search));
      
      if (conversation_id) {
        formData.append('conversation_id', conversation_id);
      }

      const response = await api.post('/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: async (data) => {
      await queryClient.refetchQueries({ queryKey: ['conversations'] });
      if (data.conversation_id) {
        await queryClient.refetchQueries({ queryKey: ['messages', data.conversation_id] });
      }
    },
  });

  // Mutation for text-only chat messages (new)
  const chatMutation = useMutation({
    mutationFn: async ({ message, mode, include_search, conversation_id }: ChatRequest) => {
      const response = await api.post('/chat', {
        message,
        mode,
        include_search,
        conversation_id,
      });
      return response.data;
    },
    onSuccess: async (data) => {
      await queryClient.refetchQueries({ queryKey: ['conversations'] });
      if (data.conversation_id) {
        await queryClient.refetchQueries({ queryKey: ['messages', data.conversation_id] });
      }
    },
  });

  return {
    processNotes: processMutation.mutateAsync,
    sendMessage: chatMutation.mutateAsync,
    isProcessing: processMutation.isPending || chatMutation.isPending,
    error: processMutation.error || chatMutation.error,
  };
}

export default useAgent;
