import * as vscode from 'vscode';

export class ConfigurationService {
    private context: vscode.ExtensionContext;
    private readonly API_KEY_SECRET = 'flowforge-ai.apiKey';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async getApiKey(): Promise<string | undefined> {
        return await this.context.secrets.get(this.API_KEY_SECRET);
    }

    public async setApiKey(apiKey: string): Promise<void> {
        await this.context.secrets.store(this.API_KEY_SECRET, apiKey);
    }

    public getDefaultModel(): string {
        const config = vscode.workspace.getConfiguration('flowforge-ai');
        return config.get<string>('defaultModel', 'copilot');
    }

    public setDefaultModel(model: string): void {
        const config = vscode.workspace.getConfiguration('flowforge-ai');
        config.update('defaultModel', model, vscode.ConfigurationTarget.Global);
    }

    public getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('flowforge-ai');
    }

    public getSelectedModel(): string {
        return this.getConfiguration().get<string>('selectedModel') || 'openai/o4-mini';
    }

    public getTemperature(): number {
        return this.getConfiguration().get<number>('temperature') || 0.7;
    }

    public getSaveHistory(): boolean {
        return this.getConfiguration().get<boolean>('saveHistory') !== undefined 
               ? this.getConfiguration().get<boolean>('saveHistory')! 
               : true; // Default to true if undefined
    }

    public async setSelectedModel(model: string): Promise<void> {
        await this.getConfiguration().update('selectedModel', model, vscode.ConfigurationTarget.Global);
    }

    public async setSaveHistory(saveHistory: boolean): Promise<void> {
        await this.getConfiguration().update('saveHistory', saveHistory, vscode.ConfigurationTarget.Global);
    }

    public async setTemperature(temperature: number): Promise<void> {
        await this.getConfiguration().update('temperature', temperature, vscode.ConfigurationTarget.Global);
    }
}
