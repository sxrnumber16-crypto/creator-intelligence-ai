import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';
// The dashboard (options page) reuses the full side-panel app shell at desktop width.
import { App } from '../sidepanel/App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
