import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center font-mono text-xs uppercase tracking-widest text-[#141414]/40">Loading System...</div>}>
      <App />
    </Suspense>
  </StrictMode>,
);
