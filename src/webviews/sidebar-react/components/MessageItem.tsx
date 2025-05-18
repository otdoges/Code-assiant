import React from 'react';
import { MessageItemProps } from '../types';
import CodeBlock from './CodeBlock';
import { extractCodeBlocks, escapeHtml } from '../utils/codeFormatter';

const MessageItem: React.FC<MessageItemProps> = ({ message, onCopy, onInsert }) => {
    const { role, content } = message;
    
    // Process message content to find code blocks
    const { blocks, textParts } = extractCodeBlocks(content);
    
    // Create a unique ID for this message
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return (
        <div className={`message ${role}`} id={messageId}>
            <div className={`avatar ${role}-avatar`}>
                {role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="content">
                {blocks.length === 0 ? (
                    // If no code blocks, render the text with newlines converted to <br>
                    <div dangerouslySetInnerHTML={{ 
                        __html: escapeHtml(content).replace(/\n/g, '<br>') 
                    }} />
                ) : (
                    // If there are code blocks, render text parts and code blocks
                    textParts.map((textPart, index) => {
                        const codeBlock = blocks[index];
                        return (
                            <React.Fragment key={`part-${index}`}>
                                {/* Render text part with line breaks */}
                                {textPart && (
                                    <div dangerouslySetInnerHTML={{ 
                                        __html: escapeHtml(textPart).replace(/\n/g, '<br>') 
                                    }} />
                                )}
                                
                                {/* Render code block if available */}
                                {codeBlock && (
                                    <CodeBlock
                                        language={codeBlock.language}
                                        code={codeBlock.code}
                                        onCopy={onCopy}
                                        onInsert={onInsert}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MessageItem;
