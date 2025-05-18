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

                    // Message types from extension to webview
                    interface VsCodeMessageUpdateResponse {
                        type: 'updateResponse';
                        value: string;
                        isError?: boolean;
                    }
                    interface VsCodeMessageModelInfo {
                        type: 'modelInfo';
                        value: string;
                    }
                    interface VsCodeMessageLoadConversation {
                        type: 'loadedConversation';
                        value: ChatMessage[];
                    }
                    interface VsCodeMessageClear {
                        type: 'clearConversation';
                    }
                    type VsCodeMessage = VsCodeMessageUpdateResponse | VsCodeMessageModelInfo | VsCodeMessageLoadConversation | VsCodeMessageClear;

                    function escapeHtml(unsafeText: string): string {
                        if (typeof unsafeText !== 'string') return '';
                        return unsafeText
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;");
                    }

                    function escapeHtmlAttribute(unsafeText: string): string {
                        if (typeof unsafeText !== 'string') return '';
                        return unsafeText
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;")
                            .replace(/\n/g, "&#10;")
                            .replace(/\r/g, "");
                    }

                    const conversation = document.getElementById('conversation') as HTMLElement;
                    const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
                    const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
                    const clearButton = document.getElementById('clear-button') as HTMLButtonElement;
                    const apiKeyButton = document.getElementById('api-key-button') as HTMLButtonElement;
                    const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
                    const typingIndicator = document.getElementById('typing-indicator') as HTMLElement;
                    const modelNameElement = document.getElementById('model-name') as HTMLElement;

                    let conversationHistory: ChatMessage[] = [];
                    let isProcessing = false;

                    function requestModelInfo() {
                        vscode.postMessage({ type: 'getModelInfo' });
                    }
                    function requestLoadConversation() {
                        vscode.postMessage({ type: 'loadConversation' });
                    }

                    requestModelInfo();
                    requestLoadConversation();

                    submitButton.addEventListener('click', handleSubmitQuery);
                    promptInput.addEventListener('keydown', (e: KeyboardEvent) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                            e.preventDefault();
                            handleSubmitQuery();
                        } else if (e.key === 'Enter' && e.ctrlKey) {
                             handleSubmitQuery();
                        }
                    });
                    promptInput.addEventListener('input', () => {
                        promptInput.style.height = 'auto';
                        promptInput.style.height = (promptInput.scrollHeight) + 'px';
                    });
                    clearButton.addEventListener('click', () => {
                        vscode.postMessage({ type: 'clearConversation' });
                    });
                    apiKeyButton.addEventListener('click', () => {
                        vscode.postMessage({ type: 'configureApiKey' });
                    });
                    settingsButton.addEventListener('click', () => {
                        vscode.postMessage({ type: 'showSettings' });
                    });

                    function handleSubmitQuery() {
                        const query = promptInput.value.trim();
                        if (!query || isProcessing) return;

                        isProcessing = true;
                        submitButton.disabled = true;
                        addMessageToUI('user', query);
                        vscode.postMessage({ type: 'submitQuery', value: query });
                        promptInput.value = '';
                        promptInput.style.height = 'auto';
                        typingIndicator.classList.remove('hidden');
                        
                        const existingLoadingMsg = document.getElementById('loading-message');
                        if (!existingLoadingMsg) {
                            const loadingElem = document.createElement('div');
                            loadingElem.className = 'message assistant loading slide-in';
                            loadingElem.id = 'loading-message';
                            loadingElem.innerHTML = 
                                `<div class="avatar assistant-avatar">🧠</div>` +
                                `<div class="content"><div class="loading-indicator"><div></div><div></div><div></div></div></div>`;
                            conversation.appendChild(loadingElem);
                            conversation.scrollTop = conversation.scrollHeight;
                        }
                    }

                    function addMessageToUI(role: 'user' | 'assistant', content: string): void {
                        const messageElem = document.createElement('div');
                        messageElem.className = `message ${role} slide-in`;
                        
                        const avatarHtml = role === 'user' ? 
                            '<div class="avatar user-avatar">👤</div>' : 
                            '<div class="avatar assistant-avatar">🧠</div>';

                        conversationHistory.push({ role, content });

                        let formattedContent = '';
                        const codeBlockRegex = new RegExp("```(.*?)\\n([\\s\\S]*?)```", "g");
                        let lastIndex = 0;

                        for (const match of content.matchAll(codeBlockRegex)) {
                            const language = match[1]?.trim().toLowerCase() || 'plaintext';
                            const codeSnippet = match[2].trim();
                            const startIndex = match.index || 0;

                            formattedContent += escapeHtml(content.substring(lastIndex, startIndex));
                            const codeBlockId = `code-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                            
                            formattedContent += 
                                `<div class="code-block-container">` +
                                    `<div class="code-block-header">` +
                                        `<span>${escapeHtml(language)}</span>` +
                                        `<div>` +
                                            `<button class="code-action-button copy-code-btn" data-target="#${codeBlockId}" title="Copy code"><i class="icon">📋</i> Copy</button>` +
                                            `<button class="code-action-button insert-code-btn" data-code="${escapeHtmlAttribute(codeSnippet)}" title="Insert code into editor"><i class="icon">📝</i> Insert</button>` +
                                        `</div>` +
                                    `</div>` +
                                    `<pre id="${codeBlockId}"><code>${escapeHtml(codeSnippet)}</code></pre>` +
                                `</div>`;
                            lastIndex = startIndex + match[0].length;
                        }
                        formattedContent += escapeHtml(content.substring(lastIndex));
                        
                        if (lastIndex === 0) {
                            formattedContent = formattedContent.replace(/\n/g, '<br>');
                        }

                        messageElem.innerHTML = `${avatarHtml}<div class="content">${formattedContent}</div>`;
                        conversation.appendChild(messageElem);
                        conversation.scrollTop = conversation.scrollHeight;

                        messageElem.querySelectorAll('.copy-code-btn').forEach(button => {
                            button.addEventListener('click', (e) => {
                                const targetSelector = (e.currentTarget as HTMLElement).dataset.target;
                                if (targetSelector) {
                                    const codeElement = messageElem.querySelector(targetSelector + ' code') as HTMLElement;
                                    if (codeElement && codeElement.textContent) {
                                        vscode.postMessage({ type: 'copyToClipboard', value: codeElement.textContent });
                                        const originalText = button.innerHTML;
                                        button.innerHTML = '<i class="icon">✅</i> Copied!';
                                        setTimeout(() => { button.innerHTML = originalText; }, 2000);
                                    }
                                }
                            });
                        });
                        messageElem.querySelectorAll('.insert-code-btn').forEach(button => {
                            button.addEventListener('click', (e) => {
                                const codeToInsert = (e.currentTarget as HTMLElement).dataset.code;
                                if (codeToInsert) {
                                    vscode.postMessage({ type: 'insertToEditor', value: codeToInsert });
                                }
                            });
                        });
                    }

                    window.addEventListener('message', (event: MessageEvent<VsCodeMessage>) => {
                        const message = event.data;
                        const loadingMessageElement = document.getElementById('loading-message');
                        if (loadingMessageElement && message.type === 'updateResponse') {
                            loadingMessageElement.remove();
                        }

                        switch (message.type) {
                            case 'updateResponse':
                                typingIndicator.classList.add('hidden');
                                if (message.isError) {
                                    addMessageToUI('assistant', `⚠️ Error: ${escapeHtml(String(message.value))}`);
                                } else {
                                    addMessageToUI('assistant', message.value);
                                }
                                isProcessing = false;
                                submitButton.disabled = false;
                                promptInput.focus();
                                break;
                            case 'clearConversation':
                                conversation.innerHTML = '';
                                conversationHistory = [];
                                break;
                            case 'modelInfo':
                                modelNameElement.textContent = message.value || 'N/A';
                                break;
                            case 'loadedConversation':
                                conversation.innerHTML = '';
                                conversationHistory = [];
                                if (message.value && Array.isArray(message.value)) {
                                    message.value.forEach(msg => addMessageToUI(msg.role, msg.content));
                                }
                                break;
                        }
                    });
                </script>
            </body>
        </html>
    `;
}
}
}