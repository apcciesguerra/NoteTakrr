import { useState, useRef, useEffect } from 'react';
import ConversationSidebar from './ConversationSidebar';
import ModeSelector from './ModeSelector';
import FileUpload from './FileUpload';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useAgent } from '../hooks/useAgent';

export default function ChatWindow() {
  const { isLoading: isAuthLoading } = useAuth();
  const { conversations, messages, activeConversation, selectConversation, deleteConversation } = useChat();
  const { processNotes, sendMessage, isProcessing } = useAgent();
  
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

  // Handle file upload (from ChatInput or FileUpload component)
  const handleFileSelect = async (file: File, _userMessage?: string) => {
    try {
      const result = await processNotes({
        file,
        mode,
        include_search: includeSearch,
        conversation_id: activeConversation || undefined,
      });
      if (!activeConversation && result.conversation_id) {
        selectConversation(result.conversation_id);
      }
    } catch (error: any) {
      console.error("Failed to process notes:", error);
      const detail = error?.response?.data?.detail || error?.message || "Unknown error";
      alert(`Error: ${detail}`);
    }
  };

  // Handle text-only chat message
  const handleSendMessage = async (text: string) => {
    try {
      const result = await sendMessage({
        message: text,
        mode,
        include_search: includeSearch,
        conversation_id: activeConversation || undefined,
      });
      if (!activeConversation && result.conversation_id) {
        selectConversation(result.conversation_id);
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      const detail = error?.response?.data?.detail || error?.message || "Unknown error";
      alert(`Error: ${detail}`);
    }
  };

  const activeConvData = conversations.find((c: any) => c.id === activeConversation);

  return (
    <div className="flex h-full w-full">
      <ConversationSidebar 
        conversations={conversations} 
        activeConversation={activeConversation} 
        onSelect={selectConversation} 
        onDelete={deleteConversation}
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
          <div className="max-w-4xl mx-auto flex flex-col pb-8">
            
            {/* Intro State / Empty State */}
            {messages.length === 0 && !isProcessing && (
              <div className="mb-8">
                <div className="flex flex-col items-center text-center space-y-4 mb-8 mt-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl rotate-3 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">How can I help you study?</h1>
                  <p className="text-gray-400 max-w-lg">
                    Upload your notes, slides, or images — or just ask a question. NoteTakrr will generate a tailored study guide or quiz you to test your knowledge.
                  </p>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                </div>
              </div>
            )}

            {/* Thinking indicator for first upload (no messages yet) */}
            {messages.length === 0 && isProcessing && (
              <div className="flex flex-col items-center mt-16 space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse">
                  <span className="text-4xl">✨</span>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">NoteTakrr is thinking</h2>
                  <p className="text-gray-400 text-sm">Analyzing your notes and generating study material...</p>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

            {/* Message History */}
            {messages.length > 0 && (
              <div className="mt-4">
                {messages.map((msg: any) => (
                  <MessageBubble 
                    key={msg.id} 
                    id={msg.id}
                    role={msg.role} 
                    content={msg.content} 
                    hasDocx={msg.role === 'assistant'} 
                  />
                ))}

                {/* Thinking Indicator — shows while waiting for AI response */}
                {isProcessing && (
                  <div className="flex gap-4 w-full mb-8">
                    <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600 animate-pulse">
                      <span className="text-white text-lg">✨</span>
                    </div>
                    <div className="flex flex-col items-start max-w-[85%]">
                      <div className="px-5 py-4 rounded-2xl bg-[#2D2D3F] text-gray-100 rounded-tl-none border border-[#3D3D53]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">NoteTakrr is thinking</span>
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Fixed Chat Input Bar at bottom — always visible */}
        <div className="border-t border-[#2D2D3F] bg-[#1F1F2E]/95 backdrop-blur-md p-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput 
              onSendMessage={handleSendMessage}
              onSendFile={handleFileSelect}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
