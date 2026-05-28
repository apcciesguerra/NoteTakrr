import { UploadCloud, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export default function FileUpload({ onFileSelect, isProcessing }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isProcessing) {
      onFileSelect(file);
    }
    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <input 
        type="file" 
        className="hidden" 
        ref={inputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
      />
      
      <div 
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          isProcessing 
            ? 'border-[#3D3D53] bg-[#181824]/50 opacity-50 cursor-not-allowed'
            : 'border-[#4D4D66] bg-[#181824]/50 hover:bg-[#2D2D3F]/80 cursor-pointer group hover:border-purple-500/50'
        }`}
      >
        <div className="flex justify-center mb-4">
          <div className={`p-4 rounded-full transition-all duration-300 ${isProcessing ? 'bg-[#2D2D3F]' : 'bg-[#2D2D3F] group-hover:bg-purple-600/20 group-hover:scale-110'}`}>
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-purple-400" />
            )}
          </div>
        </div>
        <h3 className="text-xl font-medium text-gray-200 mb-2">
          {isProcessing ? 'Processing Notes...' : 'Upload Notes'}
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          {isProcessing ? 'NoteTakrr is working its magic.' : 'Drag & drop your files here, or click to browse'}
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
