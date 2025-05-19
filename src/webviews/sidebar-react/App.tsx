import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, Settings } from './types';
import Conversation from './components/Conversation';
import InputArea from './components/InputArea';
import HeaderToolbar from './components/HeaderToolbar';
import SettingsPanel from './components/SettingsPanel';
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

// Extend window type to include our custom property
declare global {
    interface Window {
        flowforgeAiApiKeyExists?: boolean;
        vscode?: any; // For acquireVsCodeApi
    }
}

// Extend window type to include our custom property
declare global {
    interface Window {
        flowforgeAiApiKeyExists?: boolean;
        vscode?: any; // For acquireVsCodeApi
    }
}

const App: React.FC = () => {
    // Read the initial API key status from the global variable set by the extension
    const initialApiKeyExists = typeof window.flowforgeAiApiKeyExists === 'boolean' ? window.flowforgeAiApiKeyExists : false;
    const [apiKeyIsSet, setApiKeyIsSet] = useState<boolean>(initialApiKeyExists);
    const [apiKeyInputValue, setApiKeyInputValue] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modelName, setModelName] = useState('N/A');
    const [showSettings, setShowSettings] = useState(false);

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
        setShowSettings(true);
    }, []);
    
    const handleCloseSettings = useCallback(() => {
        setShowSettings(false);
    }, []);
    
    const handleSaveSettings = useCallback((settings: Settings) => {
        // Send settings to the extension
        const { apiKey, selectedModel, temperature, saveHistory } = settings;
        
        // Update API key if provided
        if (apiKey) {
            configureApiKeyApi(apiKey);
        }
        
        // Post other settings to the extension
        getVSCodeApi().postMessage({
            type: 'updateSettings',
            value: {
                selectedModel,
                temperature,
                saveHistory
            }
        });
        
        // Update the model name locally
        setModelName(selectedModel);
    }, []);

    const handleApiKeySubmit = useCallback(async () => {
        if (apiKeyInputValue.trim() === '') {
            // Optionally, show an error message in the webview
            alert('Please enter an API key.'); // Simple alert, can be improved
            return;
        }
        await configureApiKeyApi(apiKeyInputValue.trim()); // Send to extension
        setApiKeyIsSet(true); // Update UI to show chat
        // The extension side will show a confirmation message via vscode.window.showInformationMessage
    }, [apiKeyInputValue]);

    // If API key is not set, show the configuration form
    if (!apiKeyIsSet) {
        return (
            <div className="container api-key-setup">
                <h3>Set up FlowForge AI</h3>
                <p>Please enter your GitHub Personal Access Token (PAT) to get started.</p>
                <div className="api-key-input-group">
                    <input
                        type="password"
                        className="api-key-input"
                        value={apiKeyInputValue}
                        onChange={(e) => setApiKeyInputValue(e.target.value)}
                        placeholder="Enter your GitHub PAT"
                    />
                    <button className="api-key-submit-button" onClick={handleApiKeySubmit}>Save and Continue</button>
                </div>
                <p className="api-key-note"><small>Your PAT will be stored securely using VS Code's SecretStorage. Ensure it has 'models:read' permission. You can change this later in settings.</small></p>
            </div>
        );
    }

    // API key is set, show the main chat application
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
            
            <SettingsPanel
                isVisible={showSettings}
                onClose={handleCloseSettings}
                modelName={modelName}
                onSaveSettings={handleSaveSettings}
            />  
        </div>
    );
};

export default App;
