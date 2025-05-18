import * as vscode from 'vscode';
import { AIService, AiResponse, ConversationMessage } from '../services/aiService';
import { ConfigurationService } from '../services/configurationService';
import { getNonce } from '../utilities/nonce';

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
                value: response.text,
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
        
        const nonce = getNonce();
        
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleMainUri}" rel="stylesheet">
                <title>GitHub AI Assistant</title>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>GitHub AI Assistant</h1>
                    </div>
                    
                    <div class="conversation-container" id="conversation"></div>
                    
                    <div class="input-container">
                        <textarea id="prompt-input" placeholder="Ask a question or request code assistance..."></textarea>
                        <button id="submit-button">Send</button>
                    </div>
                    
                    <div class="footer">
                        <button id="clear-button">Clear Conversation</button>
                        <button id="api-key-button">Configure API Key</button>
                    </div>
                </div>
                
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    
                    // Elements
                    const conversation = document.getElementById('conversation');
                    const promptInput = document.getElementById('prompt-input');
                    const submitButton = document.getElementById('submit-button');
                    const clearButton = document.getElementById('clear-button');
                    const apiKeyButton = document.getElementById('api-key-button');
                    
                    // Initial state
                    let conversationHistory = [];
                    
                    // Add event listeners
                    submitButton.addEventListener('click', submitQuery);
                    promptInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            submitQuery();
                        }
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
                    
                    // Functions
                    function submitQuery() {
                        const query = promptInput.value.trim();
                        if (!query) {
                            return;
                        }
                        
                        // Add user message to UI
                        addMessageToUI('user', query);
                        
                        // Send to extension
                        vscode.postMessage({
                            type: 'submitQuery',
                            value: query
                        });
                        
                        // Clear input
                        promptInput.value = '';
                        
                        // Add loading indicator
                        const loadingElem = document.createElement('div');
                        loadingElem.className = 'message assistant loading';
                        loadingElem.id = 'loading-message';
                        loadingElem.innerHTML = '<div class="loading-indicator"><div></div><div></div><div></div></div>';
                        conversation.appendChild(loadingElem);
                        conversation.scrollTop = conversation.scrollHeight;
                    }
                    
                    function addMessageToUI(role, content) {
                        const messageElem = document.createElement('div');
                        messageElem.className = \`message \${role}\`;
                        
                        // Format the content for markdown
                        let formattedContent = content;
                        
                        // Store in history
                        conversationHistory.push({ role, content });
                        
                        // Replace code blocks
                        formattedContent = formattedContent.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, (match, code) => {
                            const container = document.createElement('div');
                            container.className = 'code-block-container';
                            
                            const codeBlock = document.createElement('pre');
                            codeBlock.className = 'code-block';
                            codeBlock.textContent = code.trim();
                            
                            const copyButton = document.createElement('button');
                            copyButton.className = 'copy-button';
                            copyButton.textContent = 'Copy';
                            copyButton.onclick = function() {
                                vscode.postMessage({
                                    type: 'copyToClipboard',
                                    value: code.trim()
                                });
                                copyButton.textContent = 'Copied!';
                                setTimeout(() => {
                                    copyButton.textContent = 'Copy';
                                }, 2000);
                            };
                            
                            const insertButton = document.createElement('button');
                            insertButton.className = 'insert-button';
                            insertButton.textContent = 'Insert';
                            insertButton.onclick = function() {
                                vscode.postMessage({
                                    type: 'insertToEditor',
                                    value: code.trim()
                                });
                            };
                            
                            container.appendChild(codeBlock);
                            container.appendChild(copyButton);
                            container.appendChild(insertButton);
                            
                            return container.outerHTML;
                        });
                        
                        // Replace inline code
                        formattedContent = formattedContent.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
                        
                        messageElem.innerHTML = formattedContent;
                        conversation.appendChild(messageElem);
                        conversation.scrollTop = conversation.scrollHeight;
                    }
                    
                    // Handle messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.type) {
                            case 'updateResponse':
                                // Remove loading indicator
                                const loadingElem = document.getElementById('loading-message');
                                if (loadingElem) {
                                    loadingElem.remove();
                                }
                                
                                // Add assistant message
                                addMessageToUI('assistant', message.value);
                                break;
                                
                            case 'clearConversation':
                                conversation.innerHTML = '';
                                conversationHistory = [];
                                break;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}
