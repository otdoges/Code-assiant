// Types for our React components and VS Code communication

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// Message types for communication with the extension
export interface VsCodeMessageBase {
    type: string;
}

export interface VsCodeMessageUpdateResponse extends VsCodeMessageBase {
    type: 'updateResponse';
    value: string;
    isError?: boolean;
}

export interface VsCodeMessageModelInfo extends VsCodeMessageBase {
    type: 'modelInfo';
    value: string;
}

export interface VsCodeMessageLoadConversation extends VsCodeMessageBase {
    type: 'loadedConversation';
    value: ChatMessage[];
}

export interface VsCodeMessageClear extends VsCodeMessageBase {
    type: 'clearConversation';
}

export type VsCodeMessage = 
    | VsCodeMessageUpdateResponse 
    | VsCodeMessageModelInfo 
    | VsCodeMessageLoadConversation 
    | VsCodeMessageClear;

// VS Code API wrapper
export interface VSCodeApi {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
}

// Props for our components
export interface CodeBlockProps {
    language: string;
    code: string;
    onCopy: (code: string) => void;
    onInsert: (code: string) => void;
}

export interface MessageItemProps {
    message: ChatMessage;
    onCopy: (code: string) => void;
    onInsert: (code: string) => void;
}

export interface ConversationProps {
    messages: ChatMessage[];
    isProcessing: boolean;
    onCopy: (code: string) => void;
    onInsert: (code: string) => void;
}

export interface InputAreaProps {
    onSubmit: (message: string) => void;
    disabled: boolean;
}

export interface HeaderToolbarProps {
    modelName: string;
    onClear: () => void;
    onConfigureApiKey: () => void;
    onShowSettings: () => void;
}

export interface SettingsPanelProps {
    isVisible: boolean;
    onClose: () => void;
    modelName: string;
    onSaveSettings: (settings: Settings) => void;
}

export interface Settings {
    apiKey: string;
    selectedModel: string;
    temperature: number;
    saveHistory: boolean;
}
