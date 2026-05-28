import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface ProcessRequest {
  file: File;
  mode: 'summary' | 'reviewer';
  include_search: boolean;
  conversation_id?: string;
}

export function useAgent() {
  const queryClient = useQueryClient();

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
    onSuccess: (data) => {
      // Invalidate queries so the sidebar and chat feed update
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (data.conversation_id) {
        queryClient.invalidateQueries({ queryKey: ['messages', data.conversation_id] });
      }
    },
  });

  return {
    processNotes: processMutation.mutateAsync,
    isProcessing: processMutation.isPending,
    error: processMutation.error,
  };
}

export default useAgent;
