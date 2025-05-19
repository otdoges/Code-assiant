# FlowForge AI - AI Coding Assistant for VS Code

A modern, feature-rich AI coding assistant for VS Code that helps you code more efficiently with intelligent suggestions, explanations, and real-time assistance. The extension features a sleek, user-friendly chat interface and powerful customization options.

![Code Explorer Screenshot](https://via.placeholder.com/800x500.png?text=Code+Explorer+Screenshot)

## ✨ Features

- **Modern Chat Interface** - Clean, responsive design with message bubbles and intuitive controls
- **Multiple AI Models** - Choose from various AI models to suit your needs
- **Code Formatting** - Automatic code formatting with syntax highlighting
- **Conversation History** - Save and review your chat history
- **Customizable Settings** - Fine-tune the assistant's behavior to your preferences
- **Dark/Light Theme Support** - Automatically adapts to your VS Code theme
- **API Key Management** - Securely store and manage your API keys

## 📋 Requirements

- VS Code 1.80.0 or higher
- Node.js 16.x or later
- npm or bun package manager

## 🚀 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Search for "Code Explorer"
4. Click Install
5. Reload VS Code when prompted

### From VSIX

1. Download the latest `.vsix` file from the [Releases](https://github.com/flowforge/flowforge/releases) page
2. In VS Code, go to Extensions view (Ctrl+Shift+X)
3. Click on the `...` menu and select "Install from VSIX..."
4. Select the downloaded `.vsix` file
5. Reload VS Code

## 🛠️ Configuration

### Setting Up Your API Key

1. Click the Code Explorer icon in the activity bar
2. Click the settings (⚙️) icon in the top-right corner
3. Enter your API key in the settings panel
4. Click "Save" to apply your changes

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `codeExplorer.apiKey` | Your API key for the AI service | "" |
| `codeExplorer.model` | The AI model to use (e.g., "gpt-4", "claude-3-opus") | "gpt-4" |
| `codeExplorer.temperature` | Controls randomness (0.0 to 2.0) | 0.7 |
| `codeExplorer.saveHistory` | Whether to save conversation history | true |
| `codeExplorer.autoFormatCode` | Automatically format code blocks | true |

## 💡 Usage

### Starting a New Chat

1. Click the Code Explorer icon in the activity bar
2. Type your message in the input field at the bottom
3. Press Enter or click the send button (⇧+Enter for new line)

### Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| Focus Chat Input | `Ctrl+Shift+P` then type "Focus Code Explorer Input" |
| New Chat | `Ctrl+Shift+P` then type "Code Explorer: New Chat" |
| Toggle Settings | `Ctrl+Shift+P` then type "Code Explorer: Toggle Settings" |

### Example Prompts

- **Code Explanation**: "Can you explain how this function works?"
- **Debugging**: "I'm getting an error: 'Cannot read property X of undefined'"
- **Code Generation**: "Write a React component that displays a todo list"
- **Code Review**: "How can I improve this code's performance?"

## 🧩 Advanced Features

### Custom Instructions

Set custom instructions to guide the AI's behavior:
1. Open Settings (Ctrl+,)
2. Search for "Code Explorer Custom Instructions"
3. Enter your instructions (e.g., "Always respond in Spanish")

### Code Actions

Right-click on selected code to access context-aware actions:
- Explain Code
- Refactor
- Add Documentation
- Find Bugs

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ using TypeScript and React
- Powered by modern AI technologies
- Special thanks to all contributors and users!

* `github-ai-assistant.apiKey`: Your GitHub Personal Access Token
* `github-ai-assistant.defaultModel`: The default AI model to use

## Privacy and Security

- All communication with the AI models is encrypted
- Your code is not stored permanently without your explicit permission
- API keys are stored securely in your system's credential store
- You can clear conversation history at any time

## License

MIT

---

**Enjoy coding with AI assistance!**
