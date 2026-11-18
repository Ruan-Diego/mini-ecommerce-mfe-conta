import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ShellDev } from './ShellDev';
import type { PropsRemoto } from '../contracts';

/** MFE de mentira: mostra a rota, emite eventos e lê o token. */
function AppDeTeste({ eventBus, getToken }: PropsRemoto) {
  const { pathname } = useLocation();
  const [token, setToken] = useState<string | null>('?');
  return (
    <div>
      <p>rota {pathname}</p>
      <p>token {String(token)}</p>
      <button type="button" onClick={() => eventBus.emit('carrinho:adicionar-item', { produtoId: 'orbe-cromo', quantidade: 2 })}>
        Adicionar
      </button>
      <button type="button" onClick={() => eventBus.emit('navegar', { rota: '/produtos' })}>
        Ir para produtos
      </button>
      <button type="button" onClick={async () => setToken(await getToken())}>
        Ler token
      </button>
    </div>
  );
}

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/*" element={<ShellDev nome="mfe-teste" App={AppDeTeste} alvo={new EventTarget()} />} />
      </Routes>
    </MemoryRouter>,
  );
  return within(screen.getByRole('complementary', { name: 'Shell de desenvolvimento' }));
}

describe('ShellDev', () => {
  it('registra no painel os eventos que o MFE emite', async () => {
    const painel = renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(painel.getByText('carrinho:adicionar-item')).toBeInTheDocument();
    expect(painel.getByText('{"produtoId":"orbe-cromo","quantidade":2}')).toBeInTheDocument();
    expect(painel.getByText(/1 evento\(s\)/)).toBeInTheDocument();
  });

  it('atende o evento navegar como o shell', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Ir para produtos' }));
    expect(screen.getByText('rota /produtos')).toBeInTheDocument();
  });

  it('simula login: emite auth:alterado e passa a devolver token', async () => {
    const painel = renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Ler token' }));
    expect(screen.getByText('token null')).toBeInTheDocument();

    await userEvent.click(painel.getByRole('button', { name: 'Simular login', pressed: false }));
    expect(painel.getByText('auth:alterado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ler token' }));
    expect(screen.getByText('token token-de-desenvolvimento')).toBeInTheDocument();
    expect(painel.getByRole('button', { name: 'Simular logout', pressed: true })).toBeInTheDocument();
  });

  it('emite carrinho:abrir e limpa o painel', async () => {
    const painel = renderizar();
    await userEvent.click(painel.getByRole('button', { name: 'Emitir carrinho:abrir' }));
    expect(painel.getByText('carrinho:abrir')).toBeInTheDocument();
    await userEvent.click(painel.getByRole('button', { name: 'Limpar' }));
    expect(painel.queryByText('carrinho:abrir')).not.toBeInTheDocument();
  });
});
