import { useState, useRef, useEffect, useCallback } from 'react';
import ConversationSidebar from './ConversationSidebar';
import ModeSelector from './ModeSelector';
import FileUpload from './FileUpload';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import { Bot, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useAgent } from '../hooks/useAgent';

export default function ChatWindow() {
  const { isLoading: isAuthLoading } = useAuth();
  const { conversations, messages, activeConversation, selectConversation, deleteConversation } = useChat();
  const { processNotes, sendMessage, isProcessing, streamingContent } = useAgent();
  
  const [mode, setMode] = useState<'summary' | 'reviewer'>('summary');
  const [includeSearch, setIncludeSearch] = useState(false);
  const [externalFiles, setExternalFiles] = useState<File[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, streamingContent, pendingUserMessage]);

  // Clear optimistic message when processing finishes and new messages arrive
  useEffect(() => {
    if (!isProcessing && pendingUserMessage) {
      setPendingUserMessage(null);
    }
  }, [isProcessing]);

  const handleExternalFilesConsumed = useCallback(() => {
    setExternalFiles([]);
  }, []);

  // ALL HOOKS MUST BE ABOVE THIS LINE
  // ─────────────────────────────────

  if (isAuthLoading) {
    return <div className="flex h-full w-full items-center justify-center bg-[#1F1F2E]"><span className="text-gray-400">Loading NoteTakrr...</span></div>;
  }

  const handleSendFiles = async (files: File[], _userMessage?: string) => {
    // Show optimistic message immediately
    const fileNames = files.map(f => f.name).join(', ');
    setPendingUserMessage(`📎 Uploaded: ${fileNames}`);
    
    try {
      const result = await processNotes({
        files,
        mode,
        include_search: includeSearch,
        conversation_id: activeConversation || undefined,
      });
      if (!activeConversation && result.conversation_id) {
        selectConversation(result.conversation_id);
      }
    } catch (error: any) {
      setPendingUserMessage(null);
      console.error("Failed to process notes:", error);
      const detail = error?.response?.data?.detail || error?.message || "Unknown error";
      alert(`Error: ${detail}`);
    }
  };

  const handleSendMessage = async (text: string) => {
    // Show optimistic message immediately
    setPendingUserMessage(text);
    
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
      setPendingUserMessage(null);
      console.error("Failed to send message:", error);
      const detail = error?.response?.data?.detail || error?.message || "Unknown error";
      alert(`Error: ${detail}`);
    }
  };

  const handleFilesStaged = (files: File[]) => {
    setExternalFiles(files);
  };

  const activeConvData = conversations.find((c: any) => c.id === activeConversation);

  // Determine if we're streaming (have content coming in)
  const isStreaming = isProcessing && streamingContent.length > 0;
  // Waiting phase = processing started but no tokens yet
  const isWaiting = isProcessing && streamingContent.length === 0;

  return (
    <div className="flex h-full w-full">
      <ConversationSidebar 
        conversations={conversations} 
        activeConversation={activeConversation} 
        onSelect={selectConversation} 
        onDelete={deleteConversation}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-[#1F1F2E] relative">
        <header className="h-16 border-b border-[#2D2D3F] flex items-center justify-between px-6 bg-[#1F1F2E]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 bg-[#2D2D3F] hover:bg-[#3D3D53] rounded-lg transition-colors text-gray-300 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-medium text-gray-200 truncate">
              {activeConvData ? activeConvData.title : 'New Study Session'}
            </h2>
          </div>
          <ModeSelector 
            mode={mode} 
            setMode={setMode} 
            includeSearch={includeSearch} 
            setIncludeSearch={setIncludeSearch} 
          />
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto flex flex-col pb-8">
            
            {/* Intro State */}
            {messages.length === 0 && !isProcessing && (
              <div className="mb-8">
                <div className="flex flex-col items-center text-center space-y-4 mb-8 mt-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl rotate-3 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">How can I help you study?</h1>
                  <p className="text-gray-400 max-w-lg">
                    Upload your notes, slides, or images — or just ask a question. Drag & drop up to 10 files at once!
                  </p>
                </div>
                <div className="max-w-2xl mx-auto">
                  <FileUpload onFilesStaged={handleFilesStaged} isProcessing={isProcessing} />
                </div>
              </div>
            )}

            {/* Waiting indicator (before first token) for new conversations */}
            {messages.length === 0 && isWaiting && (
              <div className="mt-4">
                {/* Show what the user sent */}
                {pendingUserMessage && (
                  <MessageBubble id="pending" role="user" content={pendingUserMessage} hasDocx={false} />
                )}
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
              </div>
            )}

            {/* Live streaming bubble for new conversations (no messages yet) */}
            {messages.length === 0 && isStreaming && (
              <div className="mt-4">
                {/* Show what the user sent */}
                {pendingUserMessage && (
                  <MessageBubble id="pending" role="user" content={pendingUserMessage} hasDocx={false} />
                )}
                <div className="flex gap-4 w-full mb-8">
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col items-start max-w-[85%]">
                    <div className="px-5 py-4 rounded-2xl bg-[#2D2D3F] text-gray-100 rounded-tl-none border border-[#3D3D53]">
                      <div className="prose prose-invert max-w-none text-[15px] leading-relaxed font-sans
                        prose-headings:text-purple-300 prose-headings:font-semibold prose-headings:mb-3 prose-headings:mt-4
                        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                        prose-p:mb-3 prose-p:text-gray-200
                        prose-strong:text-white prose-strong:font-semibold
                        prose-li:text-gray-200 prose-li:mb-1
                        prose-code:text-purple-300 prose-code:bg-[#1F1F2E] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                      ">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {streamingContent}
                        </ReactMarkdown>
                        <span className="inline-block w-2 h-5 bg-purple-400 animate-pulse ml-0.5" />
                      </div>
                    </div>
                  </div>
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

                {/* Optimistic user message — shows immediately while streaming */}
                {pendingUserMessage && isProcessing && (
                  <MessageBubble
                    id="pending"
                    role="user"
                    content={pendingUserMessage}
                    hasDocx={false}
                  />
                )}

                {/* Waiting indicator (before first token) in existing conversation */}
                {isWaiting && (
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

                {/* Live streaming bubble in existing conversation */}
                {isStreaming && (
                  <div className="flex gap-4 w-full mb-8">
                    <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col items-start max-w-[85%]">
                      <div className="px-5 py-4 rounded-2xl bg-[#2D2D3F] text-gray-100 rounded-tl-none border border-[#3D3D53]">
                        <div className="prose prose-invert max-w-none text-[15px] leading-relaxed font-sans
                          prose-headings:text-purple-300 prose-headings:font-semibold prose-headings:mb-3 prose-headings:mt-4
                          prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                          prose-p:mb-3 prose-p:text-gray-200
                          prose-strong:text-white prose-strong:font-semibold
                          prose-li:text-gray-200 prose-li:mb-1
                          prose-code:text-purple-300 prose-code:bg-[#1F1F2E] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                        ">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {streamingContent}
                          </ReactMarkdown>
                          <span className="inline-block w-2 h-5 bg-purple-400 animate-pulse ml-0.5" />
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

        {/* Fixed Chat Input Bar */}
        <div className="border-t border-[#2D2D3F] bg-[#1F1F2E]/95 backdrop-blur-md p-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput 
              onSendMessage={handleSendMessage}
              onSendFiles={handleSendFiles}
              isProcessing={isProcessing}
              externalFiles={externalFiles}
              onExternalFilesConsumed={handleExternalFilesConsumed}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
