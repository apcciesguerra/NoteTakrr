import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

export function useChat() {
  const { isAuthenticated } = useAuth();
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

  return {
    conversations,
    messages,
    activeConversation,
    selectConversation: (id: string | null) => setActiveConversation(id),
    isLoading: isLoadingConversations || isLoadingMessages,
  };
}

export default useChat;
