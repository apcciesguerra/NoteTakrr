/**
 * FileUpload — Large drop zone for the empty/intro state.
 * 
 * Now stages files instead of auto-sending them.
 * Files are passed to the parent which adds them to ChatInput's staged list.
 */
import { UploadCloud, FileText, Image as ImageIcon } from 'lucide-react';
import { useRef, useState } from 'react';

interface FileUploadProps {
  onFilesStaged: (files: File[]) => void;
  isProcessing: boolean;
}

export default function FileUpload({ onFilesStaged, isProcessing }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && !isProcessing) {
      onFilesStaged(Array.from(files).slice(0, 10));
    }
    if (inputRef.current) inputRef.current.value = '';
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
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesStaged(Array.from(files).slice(0, 10));
    }
  };

  return (
    <div className="w-full">
      <input 
        type="file" 
        className="hidden" 
        ref={inputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
        multiple
      />
      
      <div 
        onClick={() => !isProcessing && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          isProcessing 
            ? 'border-[#3D3D53] bg-[#181824]/50 opacity-50 cursor-not-allowed'
            : isDragging 
              ? 'border-purple-500 bg-[#2D2D3F]/80 cursor-pointer group scale-[1.02]' 
              : 'border-[#4D4D66] bg-[#181824]/50 hover:bg-[#2D2D3F]/80 cursor-pointer group hover:border-purple-500/50'
        }`}
      >
        <div className="flex justify-center mb-4">
          <div className={`p-4 rounded-full transition-all duration-300 ${isProcessing ? 'bg-[#2D2D3F]' : 'bg-[#2D2D3F] group-hover:bg-purple-600/20 group-hover:scale-110'}`}>
            <UploadCloud className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <h3 className="text-xl font-medium text-gray-200 mb-2">Upload Notes</h3>
        <p className="text-sm text-gray-400 mb-6">
          Drag & drop your files here, or click to browse (up to 10 files)
        </p>
        
        <div className="flex justify-center gap-6 text-xs font-medium text-gray-500">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D2D3F] rounded-md">
            <FileText className="w-4 h-4" /> PDF, DOCX, TXT
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D2D3F] rounded-md">
            <ImageIcon className="w-4 h-4" /> PNG, JPG
          </div>
        </div>
      </div>
    </div>
  );
}
