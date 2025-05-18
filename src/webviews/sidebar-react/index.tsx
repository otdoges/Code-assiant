import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Entry point for our React application
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error('Failed to find root element');
}
