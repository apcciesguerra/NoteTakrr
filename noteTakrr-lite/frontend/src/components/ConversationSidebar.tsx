import { MessageSquare, Plus, Menu } from 'lucide-react';
import { useState } from 'react';

const DUMMY_CHATS = [
  { id: '1', title: 'Biology Chapter 4 Notes' },
  { id: '2', title: 'Physics Kinematics' },
  { id: '3', title: 'History Final Review' }
];

export default function ConversationSidebar() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-4 left-4 p-2 bg-[#2D2D3F] hover:bg-[#3D3D53] rounded-lg transition-colors z-20 text-gray-300 hover:text-white"
      >
        <Menu className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="w-72 bg-[#181824] h-full flex flex-col border-r border-[#2D2D3F] transition-all duration-300 relative">
      <div className="p-4 flex items-center justify-between border-b border-[#2D2D3F]">
        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          NoteTakrr
        </h2>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-[#2D2D3F] rounded-md text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg shadow-purple-500/20 font-medium">
          <Plus className="w-4 h-4" />
          New Study Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-2 mt-4">
          Recent Chats
        </div>
        {DUMMY_CHATS.map((chat) => (
          <button 
            key={chat.id}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2D2D3F] text-gray-300 hover:text-white transition-colors text-left group"
          >
            <MessageSquare className="w-4 h-4 text-gray-500 group-hover:text-purple-400 shrink-0" />
            <span className="truncate text-sm">{chat.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
