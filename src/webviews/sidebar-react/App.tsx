import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from './types';
import Conversation from './components/Conversation';
import InputArea from './components/InputArea';
import HeaderToolbar from './components/HeaderToolbar';
import { 
    getVSCodeApi, 
    copyToClipboard, 
    insertToEditor,
    clearConversation as clearConversationApi,
    configureApiKey as configureApiKeyApi,
    showSettings as showSettingsApi,
    submitQuery as submitQueryApi,
    requestModelInfo,
    loadConversation
} from './vscode-api';

import './styles.css';

const App: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modelName, setModelName] = useState('N/A');

    // Handle messages from the extension
    const handleMessageFromExtension = useCallback((event: MessageEvent) => {
        const message = event.data;
        
        switch (message.type) {
            case 'updateResponse':
                if (message.isError) {
                    setMessages(prev => [
                        ...prev, 
                        { 
                            role: 'assistant', 
                            content: `⚠️ Error: ${message.value}` 
                        }
                    ]);
                } else {
                    setMessages(prev => [
                        ...prev, 
                        { 
                            role: 'assistant', 
                            content: message.value 
                        }
                    ]);
                }
                setIsProcessing(false);
                break;
                
            case 'modelInfo':
                setModelName(message.value || 'N/A');
                break;
                
            case 'loadedConversation':
                if (message.value && Array.isArray(message.value)) {
                    setMessages(message.value);
                }
                break;
                
            case 'clearConversation':
                setMessages([]);
                break;
        }
    }, []);

    // Initialize event listener for VS Code messages
    useEffect(() => {
        window.addEventListener('message', handleMessageFromExtension);
        
        // Request initial data
        requestModelInfo();
        loadConversation();
        
        return () => {
            window.removeEventListener('message', handleMessageFromExtension);
        };
    }, [handleMessageFromExtension]);

    // Handle query submission
    const handleSubmitQuery = useCallback((query: string) => {
        setIsProcessing(true);
        setMessages(prev => [...prev, { role: 'user', content: query }]);
        submitQueryApi(query);
    }, []);

    // Handlers for VS Code messages
    const handleCopyToClipboard = useCallback((code: string) => {
        copyToClipboard(code);
    }, []);
    
    const handleInsertToEditor = useCallback((code: string) => {
        insertToEditor(code);
    }, []);
    
    const handleClearConversation = useCallback(() => {
        clearConversationApi();
    }, []);
    
    const handleConfigureApiKey = useCallback(() => {
        configureApiKeyApi();
    }, []);
    
    const handleShowSettings = useCallback(() => {
        showSettingsApi();
    }, []);

    return (
        <div className="container">
            <HeaderToolbar
                modelName={modelName}
                onClear={handleClearConversation}
                onConfigureApiKey={handleConfigureApiKey}
                onShowSettings={handleShowSettings}
            />
            
            <Conversation
                messages={messages}
                isProcessing={isProcessing}
                onCopy={handleCopyToClipboard}
                onInsert={handleInsertToEditor}
            />
            
            <InputArea
                onSubmit={handleSubmitQuery}
                disabled={isProcessing}
            />
        </div>
    );
};

export default App;
