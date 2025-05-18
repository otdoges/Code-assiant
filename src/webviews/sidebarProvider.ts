import * as vscode from 'vscode';
import { AIService, AiResponse, ConversationMessage } from '../services/aiService';
import { ConfigurationService } from '../services/configurationService';
import { getNonce } from '../utilities/nonce';
import * as path from 'path';

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
    
    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _aiService: AIService,
        private readonly _configService: ConfigurationService
    ) {}
    
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _webviewContext: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            // Enable scripts in the webview
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._context.extensionUri, 'media'),
                vscode.Uri.joinPath(this._context.extensionUri, 'dist')
            ]
        };
        
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // Listen for messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'submitQuery':
                    const response = await this._aiService.sendMessage(data.value);
                    this.updateResponse(response);
                    break;
                    
                case 'clearConversation':
                    await this._aiService.clearConversation();
                    this.clearConversation();
                    break;
                    
                case 'configureApiKey':
                    vscode.commands.executeCommand('github-ai-assistant.configureAPIKey');
                    break;
                    
                case 'copyToClipboard':
                    vscode.env.clipboard.writeText(data.value);
                    vscode.window.showInformationMessage('Copied to clipboard!');
                    break;
                    
                case 'insertToEditor':
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor) {
                        activeEditor.edit((editBuilder) => {
                            editBuilder.insert(activeEditor.selection.active, data.value);
                        });
                    }
                    break;
            }
        });
    }
    
    public updateResponse(response: AiResponse) {
        if (this._view) {
            this._view.webview.postMessage({ 
                type: 'updateResponse', 
                value: String(response.text), // Ensure value is a string
                isError: response.error
            });
        }
    }
    
    public clearConversation() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearConversation' });
        }
    }
    
    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', 'reset.css')
        );
        
        const styleVSCodeUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', 'vscode.css')
        );
        
        const styleMainUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', 'main.css')
        );
        
        const animationCssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', 'animations.css')
        );
        
        const nonce = getNonce();
        
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource}">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleMainUri}" rel="stylesheet">
                <link href="${animationCssUri}" rel="stylesheet">
                <title>GitHub AI Assistant</title>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1><span class="logo-icon">🧠</span> GitHub AI Assistant</h1>
                        <div class="model-info">Model: <span id="model-name">...</span></div>
                    </div>
                    
                    <div class="conversation-container" id="conversation"></div>
                    
                    <div class="input-container">
                        <textarea id="prompt-input" placeholder="Ask a question or request code assistance...".replace(/\n/g, "&#10;")></textarea>
                        <button id="submit-button" class="pulse-animation">Send</button>
                    </div>
                    
                    <div class="footer">
                        <button id="clear-button" title="Clear current conversation"><i class="icon">🗑️</i> Clear Chat</button>
                        <button id="api-key-button" title="Configure your API key"><i class="icon">🔑</i> API Key</button>
                        <button id="settings-button" title="Show settings"><i class="icon">⚙️</i> Settings</button>
                    </div>
                    
                    <div id="typing-indicator" class="typing-indicator hidden">
                        <span>AI is typing</span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                </div>
                
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();

                    // Type definitions for script
                    interface ChatMessage {
                        role: 'user' | 'assistant';
                        content: string;
                    }

                    interface VsCodeMessageUpdateResponse {
                        type: 'updateResponse';
                        value: string;
                        isError?: boolean;
                    }
                    interface VsCodeMessageModelInfo {
                        type: 'updateModelInfo'; // Received from extension
                        value: string;
                    }
                    interface VsCodeMessageLoadConversation {
                        type: 'loadConversation'; // Received from extension
                        value: ChatMessage[];
                    }
                    interface VsCodeMessageClear {
                        type: 'clearConversation'; // Received from extension
                    }
                    // Union type for messages received from the extension
                    type VsCodeMessage = VsCodeMessageUpdateResponse | VsCodeMessageModelInfo | VsCodeMessageLoadConversation | VsCodeMessageClear;
                    
                    // Elements
                    const conversation = document.getElementById('conversation') as HTMLElement;
                    const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
                    const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
                    const clearButton = document.getElementById('clear-button') as HTMLButtonElement;
                    const apiKeyButton = document.getElementById('api-key-button') as HTMLButtonElement;
                    const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
                    const typingIndicator = document.getElementById('typing-indicator') as HTMLElement;
                    const modelName = document.getElementById('model-name') as HTMLElement;
                    
                    // Initial state
                    let conversationHistory: ChatMessage[] = [];
                    let isProcessing = false;
                    
                    // Get selected model info
                    function updateModelInfo() {
                        vscode.postMessage({
                            type: 'getModelInfo'
                        });
                    }
                    
                    // Initialize
                    updateModelInfo();
                    loadSavedConversation();
                    
                    function loadSavedConversation() {
                        vscode.postMessage({
                            type: 'loadConversation'
                        });
                    }
                    
                    // Add event listeners
                    submitButton.addEventListener('click', submitQuery);
                    promptInput.addEventListener('keydown', (e: KeyboardEvent) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            submitQuery();
                            e.preventDefault();
                        }
                    });
                    
                    // Auto resize textarea as user types
                    promptInput.addEventListener('input', () => {
                        promptInput.style.height = 'auto';
                        promptInput.style.height = (promptInput.scrollHeight) + 'px';
                    });
                    
                    clearButton.addEventListener('click', () => {
                        vscode.postMessage({
                            type: 'clearConversation'
                        });
                    });
                    
                    apiKeyButton.addEventListener('click', () => {
                        vscode.postMessage({
                            type: 'configureApiKey'
                        });
                    });
                    
                    settingsButton.addEventListener('click', () => {
                        vscode.postMessage({
                            type: 'showSettings'
                        });
                    });
                    
                    // Functions
                    function submitQuery() {
                        const query = promptInput.value.trim();
                        if (!query || isProcessing) {
                            return;
                        }
                        
                        isProcessing = true;
                        submitButton.disabled = true;
                        
                        // Add user message to UI with animation
                        addMessageToUI('user', query);
                        
                        // Send to extension
                        vscode.postMessage({
                            type: 'submitQuery',
                            value: query
                        });
                        
                        // Clear input and reset height
                        promptInput.value = '';
                        promptInput.style.height = 'auto';
                        
                        // Show typing indicator
                        typingIndicator.classList.remove('hidden');
                        
                        // Add loading indicator with animation
                    }
                });
                
                // Auto resize textarea as user types
                promptInput.addEventListener('input', () => {
                    promptInput.style.height = 'auto';
                    promptInput.style.height = (promptInput.scrollHeight) + 'px';
                });
                
                clearButton.addEventListener('click', () => {
                    vscode.postMessage({
                        type: 'clearConversation'
                    });
                });
                
                apiKeyButton.addEventListener('click', () => {
                    vscode.postMessage({
                        type: 'configureApiKey'
                    });
                });
                
                settingsButton.addEventListener('click', () => {
                    vscode.postMessage({
                        type: 'showSettings'
                    });
                });
                
                // Functions
                function submitQuery(): void {
                    const query = promptInput.value.trim();
                    if (!query || isProcessing) {
                        return;
                    }
                    
                    isProcessing = true;
                    submitButton.disabled = true;
                    
                    // Add user message to UI with animation
                    addMessageToUI('user', query);
                    
                    // Send to extension
                    vscode.postMessage({
                        type: 'submitQuery',
                        value: query
                    });
                    
                    // Clear input and reset height
                    promptInput.value = '';
                    promptInput.style.height = 'auto';
                    
                    // Show typing indicator
                    typingIndicator.classList.remove('hidden');
                    
                    // Add loading indicator with animation
                    const loadingElem = document.createElement('div');
                    loadingElem.className = 'message assistant loading';
                    loadingElem.id = 'loading-message';
                    loadingElem.innerHTML = '<div class="loading-indicator"><div></div><div></div><div></div></div>';
                    conversation.appendChild(loadingElem);
                    conversation.scrollTop = conversation.scrollHeight;
                }
            });
        });

        messageElem.querySelectorAll('.insert-code-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const codeToInsert = (e.currentTarget as HTMLElement).dataset.code;
                if (codeToInsert) {
                    vscode.postMessage({ type: 'insertToEditor', value: codeToInsert });
                }
                
                            typingIndicator.classList.add('hidden');
                            
                            // Add assistant message
                            addMessageToUI('assistant', message.value);
                            
                            // Reset processing state
                            isProcessing = false;
                            submitButton.disabled = false;
                            promptInput.focus();
                            break;
                            
                        case 'clearConversation':
                            conversation.innerHTML = '';
                            conversationHistory = [];
                            break;
                            
                        case 'modelInfo':
                            modelName.textContent = message.value || 'Not set';
                            break;
                            
                        case 'loadedConversation':
                            if (message.conversation && message.conversation.length) {
                                // Clear existing conversation display
                                conversation.innerHTML = '';
                                
                                // Add all messages to UI
                                message.conversation.forEach(msg => {
                                    addMessageToUI(msg.role, msg.content);
                                });
                            }
                            break;
                            
                        case 'error':
                            // Show error message
                            const loadingElement = document.getElementById('loading-message');
                            if (loadingElement) {
                                loadingElement.remove();
                            }
                            typingIndicator.classList.add('hidden');
                            isProcessing = false;
                            submitButton.disabled = false;
                            
                            // Add error message
                            const errorElem = document.createElement('div');
                            errorElem.className = 'message error';
                            errorElem.innerHTML = `<div class="error-icon">⚠️</div><div class="error-message">${message.error}</div>`;
                            conversation.appendChild(errorElem);
                            conversation.scrollTop = conversation.scrollHeight;
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
}
