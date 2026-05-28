/**
 * ChatInput — ChatGPT-style input bar with text messaging and file staging.
 * 
 * Features:
 * - Text input that grows with content
 * - File attach button (drag & drop + click)
 * - Staged file preview with remove button
 * - Send button (Enter to send, Shift+Enter for newline)
 */
import { Send, Paperclip, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onSendFile: (file: File, message?: string) => void;
  isProcessing: boolean;
}

export default function ChatInput({ onSendMessage, onSendFile, isProcessing }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [message]);

  const handleSend = () => {
    if (isProcessing) return;
    
    const trimmedMessage = message.trim();

    if (stagedFile) {
      // Send file (with optional message as context)
      onSendFile(stagedFile, trimmedMessage || undefined);
      setStagedFile(null);
      setMessage('');
    } else if (trimmedMessage) {
      // Send text-only message
      onSendMessage(trimmedMessage);
      setMessage('');
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter sends, Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setStagedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) setStagedFile(file);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canSend = !isProcessing && (message.trim().length > 0 || stagedFile !== null);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full transition-all ${isDragging ? 'ring-2 ring-purple-500 rounded-2xl' : ''}`}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
      />

      <div className="bg-[#2D2D3F] border border-[#3D3D53] rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        
        {/* Staged File Preview */}
        {stagedFile && (
          <div className="px-4 pt-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-[#1F1F2E] border border-[#3D3D53] rounded-lg text-sm">
              <span className="text-purple-400">{getFileIcon(stagedFile)}</span>
              <span className="text-gray-200 max-w-[200px] truncate">{stagedFile.name}</span>
              <span className="text-gray-500 text-xs">({formatFileSize(stagedFile.size)})</span>
              <button
                onClick={() => setStagedFile(null)}
                className="ml-1 p-0.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors text-gray-500"
                title="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-2 p-3">
          {/* Attach Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-[#1F1F2E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={stagedFile ? "Add a message (optional)..." : "Type a message or attach a file..."}
            disabled={isProcessing}
            rows={1}
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none text-[15px] leading-relaxed py-2 max-h-40 disabled:opacity-50"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`shrink-0 p-2.5 rounded-xl transition-all ${
              canSend 
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20' 
                : 'bg-[#1F1F2E] text-gray-600 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Drag overlay hint */}
      {isDragging && (
        <div className="absolute inset-0 bg-purple-600/10 border-2 border-dashed border-purple-500 rounded-2xl flex items-center justify-center z-10 pointer-events-none">
          <span className="text-purple-300 font-medium text-lg">Drop your file here</span>
        </div>
      )}
    </div>
  );
}
