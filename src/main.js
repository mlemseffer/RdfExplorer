import './styles/main.css';
import { RdfExplorer } from './app/RdfExplorer.js';
import { initTheme } from './utils/theme.js';

const start = () => {
  new RdfExplorer();
  initTheme();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
