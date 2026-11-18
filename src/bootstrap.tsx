// Modo standalone: roda o MFE sozinho, com um shell falso de desenvolvimento.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { criarEventBus } from './contracts';
import './styles/tokens.css';

const eventBus = criarEventBus();
eventBus.on('navegar', ({ rota }) => console.info('[standalone] navegar para', rota));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App basePath="/" getToken={async () => null} eventBus={eventBus} />
    </BrowserRouter>
  </StrictMode>,
);
