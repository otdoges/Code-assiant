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
                placeholder="Ask anything... (Ctrl+Enter to submit)"
                disabled={disabled}
            />
            <button
                id="submit-button"
                onClick={handleSubmit}
                disabled={disabled || !inputValue.trim()}
            >
                Send
            </button>
        </div>
    );
};

export default InputArea;
