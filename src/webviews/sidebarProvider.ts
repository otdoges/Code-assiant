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
    
    public async resolveWebviewView(
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
                vscode.Uri.joinPath(this._context.extensionUri, 'dist'),
                vscode.Uri.joinPath(this._context.extensionUri, 'out')
            ]
        };
        
        const apiKey = await this._configService.getApiKey();
        const apiKeyExists = !!apiKey;
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, apiKeyExists);
        
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
                    if (data.value) {
                        try {
                            // If API key is provided directly, use it
                            console.log('[FlowForge] SidebarProvider: Setting API key from webview...');
                            await this._configService.setApiKey(data.value);
                            vscode.window.showInformationMessage('API key updated successfully');
                            console.log('[FlowForge] SidebarProvider: Reinitializing AI client...');
                            await this._aiService.reinitializeClient(); // Re-initialize AI service with new key
                            
                            // Send confirmation to webview
                            if (this._view) {
                                console.log('[FlowForge] SidebarProvider: Notifying webview of successful API key update');
                                this._view.webview.postMessage({ type: 'apiKeyUpdateSuccess', value: true });
                            }
                        } catch (error) {
                            console.error('[FlowForge] SidebarProvider: Error setting API key:', error);
                            vscode.window.showErrorMessage('Failed to set API key. Please try again.');
                            
                            // Send error to webview
                            if (this._view) {
                                this._view.webview.postMessage({ type: 'apiKeyUpdateSuccess', value: false });
                            }
                        }
                    } else {
                        // Otherwise show the command palette to configure it
                        vscode.commands.executeCommand('flowforge-ai.configureAPIKey');
                    }
                    break;
                
                case 'updateSettings':
                    if (data.value) {
                        const { selectedModel, temperature, saveHistory } = data.value;
                        if (selectedModel) {
                            this._configService.setSelectedModel(selectedModel);
                        }
                        if (temperature !== undefined) {
                            this._configService.setTemperature(temperature);
                        }
                        if (saveHistory !== undefined) {
                            this._configService.getConfiguration().update('saveHistory', saveHistory, vscode.ConfigurationTarget.Global);
                        }
                        vscode.window.showInformationMessage('Settings updated successfully');
                    }
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
                    // Get model information from configuration
                    let modelInfo = 'N/A';
                    try {
                        modelInfo = this._configService.getSelectedModel() || 'N/A';
                    } catch (error) {
                        console.error('Error getting model info:', error);
                    }
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
                    vscode.commands.executeCommand('flowforge-ai.showSettings');
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
    
    private _getHtmlForWebview(webview: vscode.Webview, apiKeyExists: boolean) {
        // Get path to our React app resources
        const distUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'dist')
        );
        
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
                    window.flowforgeAiApiKeyExists = ${apiKeyExists ? 'true' : 'false'};
                </script>
                
                <!-- Load the React application bundle -->
                <script nonce="${nonce}" src="${distUri}/index.js"></script>
            </body>
        </html>
    `;
    }
}
