import { Route, Routes } from 'react-router-dom';
import type { PropsRemoto } from '@ruan-diego/mini-event-contracts';
import { MinhaConta } from './pages/MinhaConta';
import { Pedidos } from './pages/Pedidos';
import { PedidoDetalhe } from './pages/PedidoDetalhe';

/**
 * Módulo exposto como ./App. O shell monta este componente numa rota com "/*",
 * então as rotas abaixo são relativas a props.basePath.
 */
export default function App(_props: PropsRemoto) {
  return (
    <Routes>
      <Route index element={<MinhaConta />} />
      <Route path="pedidos" element={<Pedidos />} />
      <Route path="pedidos/:id" element={<PedidoDetalhe />} />
      <Route path="*" element={<p className="wrap muted">Página não encontrada neste microfrontend.</p>} />
    </Routes>
  );
}
