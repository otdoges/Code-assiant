import * as vscode from 'vscode';
import { ConfigurationService } from './services/configurationService';
import { AIService } from './services/aiService';
import { SidebarProvider } from './webviews/sidebarProvider';
import { StorageService } from './services/storageService';

export function activate(context: vscode.ExtensionContext) {
    // Initialize services
    const configService = new ConfigurationService(context);
    const storageService = new StorageService(context);
    const aiService = new AIService(configService, storageService);
    const sidebarProvider = new SidebarProvider(context, aiService, configService);

    // Register sidebar webview
    const sidebarView = vscode.window.registerWebviewViewProvider(
        'flowforge-ai.sidebar',
        sidebarProvider
    );
    context.subscriptions.push(sidebarView);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('flowforge-ai.showSidebar', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('Open a file to use AI Assistant');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            const prompt = await vscode.window.showInputBox({
                placeHolder: 'Ask the AI assistant...',
                prompt: 'Enter your question or request for the AI assistant'
            });

            if (!prompt) {
                return;
            }

            try {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'AI Assistant is thinking...',
                    cancellable: true
                }, async (_progress, _token) => { 
                    let tempPrompt = prompt; 
                    if (selectedText && selectedText.trim() !== '') {
                        tempPrompt = prompt + " --- Selected Code: " + selectedText.substring(0, 100).replace(/\n/g, " "); 
                    }

                    const response = await aiService.sendMessage(tempPrompt); 
                    
                    // Show response in side panel
                    vscode.commands.executeCommand('flowforge-ai.sidebar.focus');
                    if (sidebarProvider.updateResponse) { 
                        sidebarProvider.updateResponse(response);
                    }
                    
                    return Promise.resolve();
                });
            } catch (error: any) { 
                vscode.window.showErrorMessage(`AI Assistant Error: ${error.message || error}`); 
            }
        }),

        vscode.commands.registerCommand('flowforge-ai.showSettings', async () => {
            // Open the VS Code settings UI with our extension's settings
            await vscode.commands.executeCommand('workbench.action.openSettings', 'flowforge-ai');
        }),

        vscode.commands.registerCommand('flowforge-ai.configureAPIKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                ignoreFocusOut: true,
                password: true,
                placeHolder: 'Enter your GitHub Personal Access Token (PAT)',
                prompt: 'This token will be stored securely in your system keychain'
            });

            if (apiKey) {
                await configService.setApiKey(apiKey);
                vscode.window.showInformationMessage('API key saved successfully!');
            }
        }),

        vscode.commands.registerCommand('flowforge-ai.clearConversation', () => {
            sidebarProvider.clearConversation();
            vscode.window.showInformationMessage('Conversation cleared');
        }),

        vscode.commands.registerCommand('flowforge-ai.enhancePrompt', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            let prompt = '';
            if (activeEditor && activeEditor.selection && !activeEditor.selection.isEmpty) {
                prompt = activeEditor.document.getText(activeEditor.selection);
            } else {
                prompt = await vscode.window.showInputBox({ prompt: 'Enter the prompt to enhance:' }) || '';
            }

            if (prompt) {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Enhancing prompt...",
                    cancellable: false
                }, async (_progress) => {
                    const result = await aiService.enhancePrompt(prompt);
                    if (result.error) {
                        vscode.window.showErrorMessage(`Error enhancing prompt: ${result.error}`);
                    } else if (result.text) {
                        // Insert enhanced prompt or show it to the user
                        // For now, let's show it in an information message or replace selection
                        if (activeEditor && activeEditor.selection && !activeEditor.selection.isEmpty) {
                            activeEditor.edit(editBuilder => {
                                editBuilder.replace(activeEditor.selection, result.text);
                            });
                        } else {
                            vscode.env.clipboard.writeText(result.text);
                            vscode.window.showInformationMessage('Enhanced prompt copied to clipboard.');
                        }
                    }
                });
            }
        }),

    );

    console.log('FlowForge AI is now active!');
}

export function deactivate() {
    // Cleanup
}
