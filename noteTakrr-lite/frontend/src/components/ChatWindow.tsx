import ConversationSidebar from './ConversationSidebar';
import ModeSelector from './ModeSelector';
import FileUpload from './FileUpload';
import MessageBubble from './MessageBubble';

const DUMMY_MESSAGES = [
  { role: 'user' as const, content: 'Here are my notes on photosynthesis.' },
  { 
    role: 'assistant' as const, 
    content: '# Photosynthesis Study Guide\n\n**Definition:** The process by which plants convert light energy into chemical energy.\n\n### Key Stages:\n1. Light-dependent reactions\n2. Calvin Cycle',
    hasDocx: true 
  }
];

export default function ChatWindow() {
  return (
    <div className="flex h-full w-full">
      <ConversationSidebar />
      
      <main className="flex-1 flex flex-col min-w-0 bg-[#1F1F2E] relative">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-[#2D2D3F] flex items-center justify-between px-6 bg-[#1F1F2E]/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-medium text-gray-200 truncate">
            Biology Chapter 4 Notes
          </h2>
          <ModeSelector />
        </header>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto flex flex-col pb-32">
            
            {/* Intro State / Empty State */}
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
                <FileUpload />
              </div>
            </div>

            {/* Dummy Message History */}
            <div className="mt-8 border-t border-[#2D2D3F] pt-8">
              {DUMMY_MESSAGES.map((msg, i) => (
                <MessageBubble 
                  key={i} 
                  role={msg.role} 
                  content={msg.content} 
                  hasDocx={msg.hasDocx} 
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
