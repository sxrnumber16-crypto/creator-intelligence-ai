import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';
import { PopupApp } from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
