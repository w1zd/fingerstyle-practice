// Entry for the static (GitHub Pages) build: same dashboard, progress kept in the browser.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../app/globals.css';
import Dashboard from '../app/dashboard';

createRoot(document.getElementById('root')!).render(<StrictMode><Dashboard signedIn storage="local" /></StrictMode>);
