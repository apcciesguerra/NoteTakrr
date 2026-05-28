import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChatWindow from './components/ChatWindow';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-screen bg-[#1F1F2E] flex text-gray-100 overflow-hidden font-sans">
        <ChatWindow />
      </div>
    </QueryClientProvider>
  );
}

export default App;
