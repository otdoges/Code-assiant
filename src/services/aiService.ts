import * as vscode from 'vscode';
import OpenAI from 'openai';
import { ConfigurationService } from './configurationService';
import { StorageService } from './storageService';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export interface AiResponse {
    text: string;
    error?: string;
}

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export class AIService {
    private openai: OpenAI | undefined;
    private conversation: ConversationMessage[] = [];
    private githubToken: string | undefined;
    private selectedModel: string;
    private temperature: number;
    private saveHistory: boolean;

    constructor(
        private configurationService: ConfigurationService,
        private storageService: StorageService
    ) {
        // Initialize properties before use to satisfy TypeScript's strictPropertyInitialization
        this.selectedModel = ''; // Default or placeholder, will be overwritten by loadConfiguration
        this.temperature = 0.7; // Default, will be overwritten
        this.saveHistory = true; // Default, will be overwritten

        this.loadConfiguration();
        this.initializeClient();
        this.loadConversation();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('github-ai-assistant')) {
                this.loadConfiguration();
                this.initializeClient();
            }
        });
    }

    public async reinitializeClient() {
        await this.loadConfiguration(); // ensure config is fresh
        this.initializeClient();
    }

    private async loadConfiguration() {
        this.githubToken = await this.configurationService.getApiKey();
        this.selectedModel = this.configurationService.getSelectedModel();
        this.temperature = this.configurationService.getTemperature();
        this.saveHistory = this.configurationService.getSaveHistory();
    }

    private initializeClient() {
        // Try to load from .env file first
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            const envPath = path.join(rootPath, '.env');
            
            if (fs.existsSync(envPath)) {
                dotenv.config({ path: envPath });
                const envToken = process.env.GITHUB_TOKEN;
                if (envToken && !this.githubToken) {
                    this.githubToken = envToken;
                }
            }
        }
        
        if (this.githubToken) {
            this.openai = new OpenAI({
                apiKey: this.githubToken,
                baseURL: 'https://models.github.ai/inference',
            });
        } else {
            this.openai = undefined;
            // The warning will be handled by the webview UI
        }
    }

    private async loadConversation() {
        if (this.saveHistory) {
            const storedConversation = await this.storageService.getConversation();
            if (storedConversation) {
                this.conversation = storedConversation;
            }
        }
    }

    public async sendMessage(prompt: string): Promise<AiResponse> {
        if (!this.openai) {
            return { text: '', error: 'OpenAI client not initialized. Please configure your GitHub Token.' };
        }

        if (!this.selectedModel) {
            return { text: '', error: 'No AI model selected. Please configure it in settings.' };
        }

        this.conversation.push({ role: 'user', content: prompt });

        // Prepare messages for the API - ensure a system prompt if history is empty or doesn't have one
        let apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        if (this.conversation.length === 1 || !this.conversation.find(msg => msg.role === 'system')) {
            apiMessages.push({ role: 'system', content: 'You are a helpful AI coding assistant.' });
        }
        apiMessages.push(...this.conversation.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })));


        try {
            const response = await this.openai.chat.completions.create({
                model: this.selectedModel,
                messages: apiMessages,
                temperature: this.temperature,
                // stream: true, // We'll implement streaming later for better UX
            });

            const assistantResponse = response.choices[0]?.message?.content?.trim() || '';
            if (assistantResponse) {
                this.conversation.push({ role: 'assistant', content: assistantResponse });
                if (this.saveHistory) {
                    await this.storageService.setConversation(this.conversation);
                }
                return { text: assistantResponse };
            } else {
                return { text: '', error: 'No response from AI model.' };
            }
        } catch (error: any) {
            console.error('Error sending message to AI:', error);
            let errorMessage = 'Failed to get response from AI model.';
            if (error.response && error.response.data && error.response.data.error) {
                errorMessage += ` Details: ${error.response.data.error.message}`;
            } else if (error.message) {
                errorMessage += ` Details: ${error.message}`;
            }
            return { text: '', error: errorMessage };
        }
    }

    public async clearConversation(): Promise<void> {
        this.conversation = [];
        if (this.saveHistory) {
            await this.storageService.clearConversation();
        }
    }

    public getConversationHistory(): ConversationMessage[] {
        return [...this.conversation];
    }

    public async enhancePrompt(prompt: string): Promise<AiResponse> {
        if (!this.openai) {
            return { text: '', error: 'OpenAI client not initialized. Please configure your GitHub Token.' };
        }

        const enhancementInstruction = 'You are a prompt enhancement AI. Rewrite the following user prompt to be more detailed, clear, and effective for an AI coding assistant. Return only the enhanced prompt.';
        
        try {
            const response = await this.openai.chat.completions.create({
                model: this.selectedModel, // Or a specific model for prompt enhancement
                messages: [
                    { role: 'system', content: enhancementInstruction },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.5, // Lower temperature for more focused enhancement
            });

            const enhancedPrompt = response.choices[0]?.message?.content?.trim() || '';
            if (enhancedPrompt) {
                return { text: enhancedPrompt };
            } else {
                return { text: '', error: 'Could not enhance prompt.' };
            }
        } catch (error: any) {
            console.error('Error enhancing prompt:', error);
            return { text: '', error: 'Failed to enhance prompt.' };
        }
    }
}
