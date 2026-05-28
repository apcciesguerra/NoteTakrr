import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

export function useChat() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await api.get('/conversations');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', activeConversation],
    queryFn: async () => {
      if (!activeConversation) return [];
      const response = await api.get(`/conversations/${activeConversation}/messages`);
      return response.data;
    },
    enabled: isAuthenticated && !!activeConversation,
  });

  const deleteMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await api.delete(`/conversations/${conversationId}`);
    },
    // OPTIMISTIC UPDATE: Remove the conversation from the list
    // immediately (before the server responds) so the UI feels instant.
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['conversations'] });

      // Snapshot the previous value (for rollback if the delete fails)
      const previousConversations = queryClient.getQueryData(['conversations']);

      // Optimistically remove from the cache right now
      queryClient.setQueryData(['conversations'], (old: any[] | undefined) =>
        old ? old.filter((c) => c.id !== deletedId) : []
      );

      // If the deleted conversation was the active one, deselect it immediately
      if (activeConversation === deletedId) {
        setActiveConversation(null);
      }

      // Return the snapshot so we can roll back on error
      return { previousConversations };
    },
    // If the mutation fails, roll back to the previous value
    onError: (_err, _deletedId, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
    },
    // After success or failure, refetch to make sure we're in sync with the server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return {
    conversations,
    messages,
    activeConversation,
    selectConversation: (id: string | null) => setActiveConversation(id),
    deleteConversation: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    isLoading: isLoadingConversations || isLoadingMessages,
  };
}

export default useChat;
