import { BookOpen, HelpCircle, Search } from 'lucide-react';

export default function ModeSelector() {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-[#2D2D3F] p-1.5 rounded-xl border border-[#3D3D53]">
      <div className="flex bg-[#181824] rounded-lg p-1">
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all bg-purple-600 text-white shadow-md">
          <BookOpen className="w-4 h-4" />
          Summary
        </button>
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all text-gray-400 hover:text-white">
          <HelpCircle className="w-4 h-4" />
          Reviewer
        </button>
      </div>
      
      <div className="h-6 w-px bg-[#3D3D53] hidden sm:block"></div>
      
      <label className="flex items-center gap-2 cursor-pointer group text-sm text-gray-300 hover:text-white transition-colors pr-2">
        <div className="relative flex items-center justify-center w-4 h-4 rounded border border-[#4D4D66] group-hover:border-purple-500 bg-[#181824] transition-colors">
          {/* Checked state placeholder */}
        </div>
        <Search className="w-4 h-4 text-gray-400 group-hover:text-purple-400" />
        <span>Web Search</span>
      </label>
    </div>
  );
}
