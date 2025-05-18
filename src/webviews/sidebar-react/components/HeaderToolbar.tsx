import React from 'react';
import { HeaderToolbarProps } from '../types';

const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
    modelName,
    onClear,
    onConfigureApiKey,
    onShowSettings
}) => {
    return (
        <div className="header-toolbar">
            <button onClick={onClear} title="Clear conversation">
                Clear
            </button>
            <button onClick={onConfigureApiKey} title="Configure API key">
                API Key
            </button>
            <button onClick={onShowSettings} title="Open settings">
                Settings
            </button>
            <div id="model-name" title="Current AI model">
                Model: {modelName}
            </div>
        </div>
    );
};

export default HeaderToolbar;
