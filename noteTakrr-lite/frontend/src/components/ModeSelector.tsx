import { BookOpen, HelpCircle, Search } from 'lucide-react';

interface ModeSelectorProps {
  mode: 'summary' | 'reviewer';
  setMode: (mode: 'summary' | 'reviewer') => void;
  includeSearch: boolean;
  setIncludeSearch: (val: boolean) => void;
}

export default function ModeSelector({ mode, setMode, includeSearch, setIncludeSearch }: ModeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-[#2D2D3F] p-1.5 rounded-xl border border-[#3D3D53]">
      <div className="flex bg-[#181824] rounded-lg p-1">
        <button 
          onClick={() => setMode('summary')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'summary' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          <BookOpen className="w-4 h-4" />
          Summary
        </button>
        <button 
          onClick={() => setMode('reviewer')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'reviewer' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          <HelpCircle className="w-4 h-4" />
          Reviewer
        </button>
      </div>
      
      <div className="h-6 w-px bg-[#3D3D53] hidden sm:block"></div>
      
      <label className="flex items-center gap-2 cursor-pointer group text-sm text-gray-300 hover:text-white transition-colors pr-2">
        <input 
          type="checkbox" 
          checked={includeSearch} 
          onChange={(e) => setIncludeSearch(e.target.checked)} 
          className="hidden" 
        />
        <div className={`relative flex items-center justify-center w-4 h-4 rounded border ${includeSearch ? 'bg-purple-500 border-purple-500' : 'border-[#4D4D66] bg-[#181824] group-hover:border-purple-500'} transition-colors`}>
          {includeSearch && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-white"><path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>}
        </div>
        <Search className={`w-4 h-4 ${includeSearch ? 'text-purple-400' : 'text-gray-400 group-hover:text-purple-400'}`} />
        <span>Web Search</span>
      </label>
    </div>
  );
}
