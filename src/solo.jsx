import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SoloView from './SoloView.jsx';
import './index.css';

// Point d'entrée de la version solo autonome (une seule page HTML, sans serveur).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="bg-african">
      <SoloView />
    </div>
  </StrictMode>,
);
