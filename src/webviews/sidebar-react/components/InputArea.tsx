import React, { useState, useRef, useEffect } from 'react';
import { InputAreaProps } from '../types';

const InputArea: React.FC<InputAreaProps> = ({ onSubmit, disabled }) => {
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize the textarea as content changes
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [inputValue]);

    const handleSubmit = () => {
        const trimmedValue = inputValue.trim();
        if (trimmedValue && !disabled) {
            onSubmit(trimmedValue);
            setInputValue('');
            
            // Reset height after clearing
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter (without Shift) or Ctrl+Enter
        if (e.key === 'Enter' && !e.shiftKey && !disabled) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Enter' && e.ctrlKey && !disabled) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="prompt-container">
            <textarea
                ref={textareaRef}
                id="prompt-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                disabled={disabled}
            />
            <button
                id="submit-button"
                onClick={handleSubmit}
                disabled={!inputValue.trim() || disabled}
                aria-label="Send message"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                </svg>
            </button>
        </div>
    );
};

export default InputArea;
