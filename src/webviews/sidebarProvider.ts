import * as vscode from 'vscode';
import { AIService, AiResponse, ConversationMessage } from '../services/aiService';
import { ConfigurationService } from '../services/configurationService';
import { getNonce } from '../utilities/nonce';
import * as path from 'path';
import * as fs from 'fs';

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
                vscode.Uri.joinPath(this._context.extensionUri, 'src', 'webviews', 'sidebar-react'),
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
                    
                case 'getModelInfo':
                    const modelInfo = this._configService.getModelInfo() || 'N/A';
                    if (this._view) {
                        this._view.webview.postMessage({ 
                            type: 'modelInfo', 
                            value: modelInfo
                        });
                    }
                    break;
                    
                case 'loadConversation':
                    const history = this._aiService.getConversationHistory();
                    if (this._view) {
                        this._view.webview.postMessage({ 
                            type: 'loadedConversation', 
                            value: history
                        });
                    }
                    break;
                    
                case 'showSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'github-ai-assistant');
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
        // Get path to our React app resources
        const reactAppUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'src', 'webviews', 'sidebar-react')
        );

        // Get path to CSS resources
        const styleResetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', 'reset.css')
        );
        
        const styleVSCodeUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', 'vscode.css')
        );
        
        const reactStylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'src', 'webviews', 'sidebar-react', 'styles.css')
        );
        
        // Generate a nonce to allow only specific inline scripts
        const nonce = getNonce();
        
        // Return simplified HTML that loads our React application
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource}">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${reactStylesUri}" rel="stylesheet">
                <title>AI Chat</title>
            </head>
            <body>
                <div id="root"></div>
                
                <script nonce="${nonce}">
                    // Initialize the VS Code API for communication
                    const vscode = acquireVsCodeApi();
                </script>
                
                <!-- Load the React application bundle -->
                <script nonce="${nonce}" src="${reactAppUri}/index.js"></script>

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
                }

                function addMessageToUI(role: 'user' | 'assistant', content: string): void {
                    const messageElem = document.createElement('div');
                    messageElem.className = 'message ' + role + ' slide-in';
                    
                    const avatarHtml = role === 'user' ? 
                        '<div class="avatar user-avatar">👤</div>' : 
                        '<div class="avatar assistant-avatar">🧠</div>';

                    conversationHistory.push({ role, content });

                    let formattedContent = '';
                    const codeBlockRegex = /```(.*?)\n([\s\S]*?)```/g; 
                    let lastIndex = 0;
                    let match;
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
                                    addMessageToUI('assistant', String(message.value));
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
                                    message.value.forEach((msg: ChatMessage) => addMessageToUI(msg.role, msg.content));
                                }
                                break;
                        }
                    });
                </script>
            </body>
        </html>
    `;
}