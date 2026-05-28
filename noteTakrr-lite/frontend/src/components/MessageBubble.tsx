/**
 * MessageBubble component - Renders individual chat messages.
 */

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

function MessageBubble({ role, content }: MessageBubbleProps) {
  return (
    <div>
      {/* TODO: Implement styled message bubble with role-based styling */}
      <p>{content}</p>
    </div>
  );
}

export default MessageBubble;
