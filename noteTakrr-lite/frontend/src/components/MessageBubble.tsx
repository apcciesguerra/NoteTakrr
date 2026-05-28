/**
 * MessageBubble component - Renders individual chat messages with
 * proper Markdown formatting, math/formula rendering, and authenticated DOCX downloads.
 */
import { FileDown, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { api } from '../lib/api';

interface MessageBubbleProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hasDocx?: boolean;
}

export default function MessageBubble({ id, role, content, hasDocx }: MessageBubbleProps) {
  const isAssistant = role === 'assistant';

  const handleDownload = async () => {
    try {
      const response = await api.get(`/download/${id}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `study_material_${id}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download document. Please try again.');
    }
  };

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
          {isAssistant ? (
            <div className="prose prose-invert max-w-none text-[15px] leading-relaxed font-sans
              prose-headings:text-purple-300 prose-headings:font-semibold prose-headings:mb-3 prose-headings:mt-4
              prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
              prose-p:mb-3 prose-p:text-gray-200
              prose-strong:text-white prose-strong:font-semibold
              prose-li:text-gray-200 prose-li:mb-1
              prose-ul:my-2 prose-ol:my-2
              prose-code:text-purple-300 prose-code:bg-[#1F1F2E] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-hr:border-[#3D3D53] prose-hr:my-4
            ">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
              {content.length > 200 ? content.substring(0, 200) + '...' : content}
            </div>
          )}
        </div>
        
        {hasDocx && isAssistant && (
          <button 
            onClick={handleDownload}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-[#2D2D3F] hover:bg-[#3D3D53] border border-purple-500/30 text-purple-300 hover:text-purple-200 rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            Download Study Document (DOCX)
          </button>
        )}
      </div>
    </div>
  );
}
