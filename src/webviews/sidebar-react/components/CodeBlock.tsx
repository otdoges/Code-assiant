import React, { useState } from 'react';
import { CodeBlockProps } from '../types';

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, onCopy, onInsert }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        onCopy(code);
        setCopied(true);
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };
    
    return (
        <div className="code-block-container">
            <div className="code-block-header">
                <span>{language}</span>
                <div>
                    <button 
                        className="code-action-button copy-code-btn"
                        onClick={handleCopy}
                        title="Copy code"
                    >
                        <i className="icon">{copied ? '✅' : '📋'}</i> {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button 
                        className="code-action-button insert-code-btn"
                        onClick={() => onInsert(code)}
                        title="Insert code into editor"
                    >
                        <i className="icon">📝</i> Insert
                    </button>
                </div>
            </div>
            <pre>
                <code>{code}</code>
            </pre>
        </div>
    );
};

export default CodeBlock;
