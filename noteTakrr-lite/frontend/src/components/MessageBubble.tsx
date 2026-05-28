/**
 * MessageBubble component - Renders individual chat messages.
 */
import { FileDown, Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  hasDocx?: boolean;
}

export default function MessageBubble({ role, content, hasDocx }: MessageBubbleProps) {
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex gap-4 w-full ${isAssistant ? '' : 'flex-row-reverse'} mb-8`}>
      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
        isAssistant ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-[#3D3D53]'
      }`}>
        {isAssistant ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
      </div>
      
      <div className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} max-w-[85%]`}>
        <div className={`px-5 py-4 rounded-2xl ${
          isAssistant 
            ? 'bg-[#2D2D3F] text-gray-100 rounded-tl-none border border-[#3D3D53]' 
            : 'bg-purple-600 text-white rounded-tr-none shadow-lg shadow-purple-500/20'
        }`}>
          <div className="prose prose-invert max-w-none text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
            {content}
          </div>
        </div>
        
        {hasDocx && isAssistant && (
          <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-[#2D2D3F] hover:bg-[#3D3D53] border border-purple-500/30 text-purple-300 hover:text-purple-200 rounded-lg text-sm font-medium transition-all shadow-sm">
            <FileDown className="w-4 h-4" />
            Download Study Document (DOCX)
          </button>
        )}
      </div>
    </div>
  );
}
