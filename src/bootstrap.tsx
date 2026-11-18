// Modo standalone: roda o MFE sozinho dentro de um shell falso de desenvolvimento.
// No shell de verdade, este arquivo não é usado: o shell importa só o ./App exposto.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ShellDev } from './dev/ShellDev';
import './styles/tokens.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ShellDev nome="mfe-conta" App={App} />
    </BrowserRouter>
  </StrictMode>,
);
