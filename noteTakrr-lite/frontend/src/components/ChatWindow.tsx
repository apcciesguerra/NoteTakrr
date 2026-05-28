import { useState, useRef, useEffect } from 'react';
import ConversationSidebar from './ConversationSidebar';
import ModeSelector from './ModeSelector';
import FileUpload from './FileUpload';
import MessageBubble from './MessageBubble';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useAgent } from '../hooks/useAgent';

export default function ChatWindow() {
  const { isLoading: isAuthLoading } = useAuth();
  const { conversations, messages, activeConversation, selectConversation } = useChat();
  const { processNotes, isProcessing } = useAgent();
  
  const [mode, setMode] = useState<'summary' | 'reviewer'>('summary');
  const [includeSearch, setIncludeSearch] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (isAuthLoading) {
    return <div className="flex h-full w-full items-center justify-center bg-[#1F1F2E]"><span className="text-gray-400">Loading NoteTakrr...</span></div>;
  }

  const handleFileSelect = async (file: File) => {
    try {
      const result = await processNotes({
        file,
        mode,
        include_search: includeSearch,
        conversation_id: activeConversation || undefined,
      });
      // If it's a new conversation, automatically select it so messages render
      if (!activeConversation && result.conversation_id) {
        selectConversation(result.conversation_id);
      }
    } catch (error) {
      console.error("Failed to process notes:", error);
      alert("There was an error processing your notes. Please try again.");
    }
  };

  const activeConvData = conversations.find((c: any) => c.id === activeConversation);

  return (
    <div className="flex h-full w-full">
      <ConversationSidebar 
        conversations={conversations} 
        activeConversation={activeConversation} 
        onSelect={selectConversation} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-[#1F1F2E] relative">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-[#2D2D3F] flex items-center justify-between px-6 bg-[#1F1F2E]/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-medium text-gray-200 truncate">
            {activeConvData ? activeConvData.title : 'New Study Session'}
          </h2>
          <ModeSelector 
            mode={mode} 
            setMode={setMode} 
            includeSearch={includeSearch} 
            setIncludeSearch={setIncludeSearch} 
          />
        </header>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto flex flex-col pb-32">
            
            {/* Intro State / Empty State */}
            {messages.length === 0 && !isProcessing && (
              <div className="mb-8">
                <div className="flex flex-col items-center text-center space-y-4 mb-8 mt-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl rotate-3 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">How can I help you study?</h1>
                  <p className="text-gray-400 max-w-lg">
                    Upload your notes, slides, or images. NoteTakrr will generate a tailored study guide or quiz you to test your knowledge.
                  </p>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                </div>
              </div>
            )}

            {/* Message History */}
            {messages.length > 0 && (
              <div className="mt-8">
                {messages.map((msg: any) => (
                  <MessageBubble 
                    key={msg.id} 
                    id={msg.id}
                    role={msg.role} 
                    content={msg.content} 
                    hasDocx={msg.role === 'assistant'} 
                  />
                ))}
                
                {/* Fixed FileUpload at bottom of active conversation */}
                <div className="mt-8 border-t border-[#2D2D3F] pt-8 max-w-2xl mx-auto">
                  <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                </div>
              </div>
            )}
            
            <div ref={bottomRef} />
          </div>
        </div>
      </main>
    </div>
  );
}
