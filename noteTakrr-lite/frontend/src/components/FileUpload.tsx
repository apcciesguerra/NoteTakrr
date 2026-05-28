import { UploadCloud, FileText, Image as ImageIcon } from 'lucide-react';

export default function FileUpload() {
  return (
    <div className="w-full">
      <div className="border-2 border-dashed border-[#4D4D66] rounded-2xl bg-[#181824]/50 hover:bg-[#2D2D3F]/80 transition-all p-10 text-center cursor-pointer group hover:border-purple-500/50">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-[#2D2D3F] rounded-full group-hover:bg-purple-600/20 group-hover:scale-110 transition-all duration-300">
            <UploadCloud className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <h3 className="text-xl font-medium text-gray-200 mb-2">Upload Notes</h3>
        <p className="text-sm text-gray-400 mb-6">
          Drag & drop your files here, or click to browse
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
