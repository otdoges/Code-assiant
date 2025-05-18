import * as vscode from 'vscode';
import { ConversationMessage } from './aiService';

export class StorageService {
    private context: vscode.ExtensionContext;
    private readonly CONVERSATION_KEY = 'github-ai-assistant.conversation';
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    public async getConversation(): Promise<ConversationMessage[]> {
        const conversationData = this.context.globalState.get<string>(this.CONVERSATION_KEY);
        if (!conversationData) {
            return [];
        }
        
        try {
            return JSON.parse(conversationData);
        } catch (error) {
            console.error('Error parsing conversation data:', error);
            return [];
        }
    }
    
    public async setConversation(conversation: ConversationMessage[]): Promise<void> {
        await this.context.globalState.update(this.CONVERSATION_KEY, JSON.stringify(conversation));
    }
    
    public async clearConversation(): Promise<void> {
        await this.context.globalState.update(this.CONVERSATION_KEY, undefined);
    }
}
