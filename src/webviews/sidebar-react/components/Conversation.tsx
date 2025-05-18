import React, { useRef, useEffect } from 'react';
import { ConversationProps } from '../types';
import MessageItem from './MessageItem';

const Conversation: React.FC<ConversationProps> = ({ 
    messages, 
    isProcessing, 
    onCopy, 
    onInsert 
}) => {
    const conversationRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the bottom when messages change
    useEffect(() => {
        if (conversationRef.current) {
            conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
        }
    }, [messages, isProcessing]);

    return (
        <div className="conversation-container" ref={conversationRef}>
            {messages.map((message, index) => (
                <MessageItem 
                    key={`message-${index}`}
                    message={message}
                    onCopy={onCopy}
                    onInsert={onInsert}
                />
            ))}
            
            {isProcessing && (
                <div className="message assistant typing-indicator">
                    <div className="avatar assistant-avatar">🧠</div>
                    <div className="content">
                        <div className="typing-animation">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span style={{ marginLeft: '8px' }}>Thinking...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Conversation;
