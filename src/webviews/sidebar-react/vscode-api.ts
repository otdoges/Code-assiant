import { VSCodeApi } from './types';

// This file provides a bridge to the VS Code API 
// that is injected into the webview's global scope.

// Declare the VS Code API in the global scope
declare global {
    interface Window {
        acquireVsCodeApi: () => VSCodeApi;
    }
}

// Create a singleton that exposes the VS Code API
// This ensures we only call acquireVsCodeApi() once
let vscodeApi: VSCodeApi | undefined = undefined;

export function getVSCodeApi(): VSCodeApi {
    if (!vscodeApi) {
        vscodeApi = window.acquireVsCodeApi();
    }
    return vscodeApi;
}

// Helper functions for common VS Code API operations
export function postMessageToExtension(type: string, value?: any): void {
    const vscode = getVSCodeApi();
    vscode.postMessage({ type, value });
}

export function copyToClipboard(text: string): void {
    postMessageToExtension('copyToClipboard', text);
}

export function insertToEditor(text: string): void {
    postMessageToExtension('insertToEditor', text);
}

export function submitQuery(query: string): void {
    postMessageToExtension('submitQuery', query);
}

export function clearConversation(): void {
    postMessageToExtension('clearConversation');
}

export function configureApiKey(apiKey?: string): void {
    postMessageToExtension('configureApiKey', apiKey);
}

export function showSettings(): void {
    postMessageToExtension('showSettings');
}

export function requestModelInfo(): void {
    postMessageToExtension('getModelInfo');
}

export function loadConversation(): void {
    postMessageToExtension('loadConversation');
}
