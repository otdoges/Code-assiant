import React, { useState, useEffect } from 'react';
import { SettingsPanelProps } from '../types';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
    isVisible, 
    onClose, 
    modelName,
    onSaveSettings
}) => {
    const [apiKey, setApiKey] = useState('');
    const [selectedModel, setSelectedModel] = useState(modelName || 'openai/gpt-4.1');
    const [temperature, setTemperature] = useState(0.7);
    const [saveHistory, setSaveHistory] = useState(true);

    // Close settings when Escape key is pressed
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isVisible) {
                onClose();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, onClose]);

    // Apply settings
    const handleSave = () => {
        onSaveSettings({
            apiKey,
            selectedModel,
            temperature,
            saveHistory
        });
        onClose();
    };

    if (!isVisible) return null;

    return (
        <div className="settings-panel-overlay">
            <div className="settings-panel">
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button className="close-button" onClick={onClose} title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                
                <div className="settings-content">
                    <div className="settings-group">
                        <label htmlFor="api-key">API Key</label>
                        <input 
                            type="password" 
                            id="api-key" 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)} 
                            placeholder="Enter your GitHub PAT with models:read permission"
                        />
                        <div className="help-text">
                            Personal Access Token with 'models:read' permission
                        </div>
                    </div>
                    
                    <div className="settings-group">
                        <label htmlFor="model-select">AI Model</label>
                        <select 
                            id="model-select" 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                        >
                            <option value="openai/o4-mini">OpenAI O4 Mini</option>
                            <option value="openai/gpt-4.1">OpenAI GPT-4.1</option>
                            <option value="meta/Llama-4-Scout-17B-16E-Instruct">Meta Llama 4 Scout</option>
                            <option value="anthropic/claude-3-5-sonnet-20240620">Anthropic Claude 3.5 Sonnet</option>
                        </select>
                        <div className="help-text">
                            Choose the AI model to power your coding assistant
                        </div>
                    </div>
                    
                    <div className="settings-group">
                        <label htmlFor="temperature">Temperature: {temperature}</label>
                        <div className="range-slider-container">
                            <input 
                                type="range" 
                                id="temperature" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                value={temperature}
                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            />
                            <div className="range-labels">
                                <span>Precise</span>
                                <span>Creative</span>
                            </div>
                        </div>
                        <div className="help-text">
                            Lower values make responses more focused, higher values more creative
                        </div>
                    </div>
                    
                    <div className="settings-group">
                        <label className="checkbox-label">
                            <input 
                                type="checkbox" 
                                id="save-history" 
                                checked={saveHistory}
                                onChange={(e) => setSaveHistory(e.target.checked)}
                            />
                            Save conversation history
                        </label>
                        <div className="help-text">
                            Keep history of conversations between sessions
                        </div>
                    </div>
                </div>
                
                <div className="settings-footer">
                    <button className="secondary-button" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="primary-button" onClick={handleSave}>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
