// Utilities for handling code blocks and HTML escaping

// Escape HTML to prevent XSS attacks
export function escapeHtml(unsafeText: string): string {
    if (typeof unsafeText !== 'string') return '';
    return unsafeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Escape HTML for use in attributes
export function escapeHtmlAttribute(unsafeText: string): string {
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

// Find and extract code blocks from text using regex
export interface CodeBlock {
    language: string;
    code: string;
    startIndex: number;
    endIndex: number;
}

export function extractCodeBlocks(content: string): { blocks: CodeBlock[], textParts: string[] } {
    const codeBlockRegex = /```(.*?)\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    const textParts: string[] = [];
    
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
        const language = match[1]?.trim().toLowerCase() || 'plaintext';
        const code = match[2].trim();
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;
        
        // Add text before this code block
        if (startIndex > lastIndex) {
            textParts.push(content.substring(lastIndex, startIndex));
        }
        
        blocks.push({
            language,
            code,
            startIndex,
            endIndex
        });
        
        lastIndex = endIndex;
    }
    
    // Add any remaining text
    if (lastIndex < content.length) {
        textParts.push(content.substring(lastIndex));
    }
    
    return { blocks, textParts };
}
