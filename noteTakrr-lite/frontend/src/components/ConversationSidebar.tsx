import { MessageSquare, Plus, Menu, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ConversationSidebarProps {
  conversations: any[];
  activeConversation: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export default function ConversationSidebar({ conversations, activeConversation, onSelect, onDelete }: ConversationSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    // Stop the click from selecting the conversation
    e.stopPropagation();
    if (confirm('Delete this conversation? This cannot be undone.')) {
      onDelete(chatId);
    }
  };

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
        <button 
          onClick={() => onSelect(null)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg shadow-purple-500/20 font-medium"
        >
          <Plus className="w-4 h-4" />
          New Study Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-2 mt-4">
          Recent Chats
        </div>
        {conversations.map((chat) => (
          <div 
            key={chat.id}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group cursor-pointer ${
              activeConversation === chat.id 
                ? 'bg-[#2D2D3F] text-white border border-[#3D3D53]' 
                : 'hover:bg-[#2D2D3F]/50 text-gray-300 hover:text-white border border-transparent'
            }`}
            onClick={() => onSelect(chat.id)}
          >
            <MessageSquare className={`w-4 h-4 shrink-0 ${activeConversation === chat.id ? 'text-purple-400' : 'text-gray-500 group-hover:text-purple-400'}`} />
            <span className="truncate text-sm flex-1">{chat.title}</span>
            <button
              onClick={(e) => handleDelete(e, chat.id)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all"
              title="Delete conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
