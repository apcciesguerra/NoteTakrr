/**
 * ChatInput — ChatGPT-style input bar with text messaging and multi-file staging.
 * 
 * Features:
 * - Text input that grows with content
 * - File attach button (supports multiple files, up to 10)
 * - Drag & drop stages files (does NOT auto-send)
 * - Staged file previews with individual remove buttons
 * - Send button (Enter to send, Shift+Enter for newline)
 */
import { Send, Paperclip, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onSendFiles: (files: File[], message?: string) => void;
  isProcessing: boolean;
  /** Allows parent to inject staged files (e.g., from the big upload zone) */
  externalFiles?: File[];
  onExternalFilesConsumed?: () => void;
}

export default function ChatInput({ onSendMessage, onSendFiles, isProcessing, externalFiles, onExternalFilesConsumed }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pick up externally staged files (from the big upload zone drag & drop)
  useEffect(() => {
    if (externalFiles && externalFiles.length > 0) {
      setStagedFiles(prev => {
        const combined = [...prev, ...externalFiles].slice(0, 10);
        return combined;
      });
      onExternalFilesConsumed?.();
    }
  }, [externalFiles, onExternalFilesConsumed]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [message]);

  const handleSend = () => {
    if (isProcessing) return;
    const trimmedMessage = message.trim();

    if (stagedFiles.length > 0) {
      onSendFiles(stagedFiles, trimmedMessage || undefined);
      setStagedFiles([]);
      setMessage('');
    } else if (trimmedMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }

    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    setStagedFiles(prev => {
      const combined = [...prev, ...fileArray].slice(0, 10); // max 10
      return combined;
    });
  };

  const removeFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
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
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canSend = !isProcessing && (message.trim().length > 0 || stagedFiles.length > 0);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full transition-all relative ${isDragging ? 'ring-2 ring-purple-500 rounded-2xl' : ''}`}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
        multiple
      />

      <div className="bg-[#2D2D3F] border border-[#3D3D53] rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
        
        {/* Staged Files Preview */}
        {stagedFiles.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap gap-2">
            {stagedFiles.map((file, idx) => (
              <div 
                key={`${file.name}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1F1F2E] border border-[#3D3D53] rounded-lg text-xs"
              >
                <span className="text-purple-400">{getFileIcon(file)}</span>
                <span className="text-gray-200 max-w-[140px] truncate">{file.name}</span>
                <span className="text-gray-500">({formatFileSize(file.size)})</span>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-0.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors text-gray-500"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {stagedFiles.length >= 10 && (
              <span className="text-xs text-yellow-400 self-center ml-1">Max 10 files</span>
            )}
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-2 p-3">
          {/* Attach Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || stagedFiles.length >= 10}
            className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-[#1F1F2E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach files (max 10)"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={stagedFiles.length > 0 
              ? `${stagedFiles.length} file${stagedFiles.length > 1 ? 's' : ''} attached — add a message or press Send`
              : "Type a message or attach a file..."
            }
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

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-purple-600/10 border-2 border-dashed border-purple-500 rounded-2xl flex items-center justify-center z-10 pointer-events-none">
          <span className="text-purple-300 font-medium text-lg">Drop files here (max 10)</span>
        </div>
      )}
    </div>
  );
}
