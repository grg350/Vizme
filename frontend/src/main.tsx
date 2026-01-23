import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Initialize theme store
import './store/themeStore';

// Get the root element and tell TypeScript what it is
const rootElement = document.getElementById('root') as HTMLElement;

// Create a React root and render the app
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
