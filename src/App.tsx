import { Route, Routes } from 'react-router-dom';
import type { PropsRemoto } from '@ruan-diego/mini-event-contracts';
import { ContaProvider } from './contexto';
import { LayoutConta } from './pages/LayoutConta';
import { MinhaConta } from './pages/MinhaConta';
import { Pedidos } from './pages/Pedidos';
import { PedidoDetalhe } from './pages/PedidoDetalhe';
import './conta.css';

/**
 * Módulo exposto como ./App. O shell monta este componente numa rota com "/*",
 * então as rotas abaixo são relativas a props.basePath.
 */
export default function App({ getToken, eventBus }: PropsRemoto) {
  return (
    <ContaProvider getToken={getToken} eventBus={eventBus}>
      <Routes>
        <Route element={<LayoutConta />}>
          <Route index element={<MinhaConta />} />
          <Route path="pedidos" element={<Pedidos />} />
        </Route>
        <Route path="pedidos/:id" element={<PedidoDetalhe />} />
        <Route path="*" element={<p className="wrap muted">Página não encontrada neste microfrontend.</p>} />
      </Routes>
    </ContaProvider>
  );
}
