import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { criarEventBus } from '@ruan-diego/mini-event-contracts';
import App from '../App';
import type { Pedido, StatusPedido } from '../api/pedidos';
import { paginar, POR_PAGINA, resumoDosItens } from '../pedidosLista';

function pedido(n: number, status: StatusPedido = 'PAGO', extra: Partial<Pedido> = {}): Pedido {
  const dia = String(n).padStart(2, '0');
  return {
    id: `${String(n).padStart(8, '0')}-aaaa-bbbb-cccc-dddddddddddd`,
    status,
    itens: [{ produtoId: 'p1', nome: `Produto ${n}`, precoUnitario: 10, quantidade: 1, subtotal: 10 }],
    endereco: { destinatario: 'Ana', cep: '40020000', logradouro: 'Rua Chile', numero: '1', complemento: null, bairro: 'Centro', cidade: 'Salvador', uf: 'BA' },
    frete: { codigo: 'padrao', nome: 'Padrão', valor: 19.9, prazoDias: 5 },
    subtotal: 10,
    total: 29.9,
    codigoRastreio: null,
    criadoEm: `2026-10-${dia}T12:00:00Z`,
    atualizadoEm: `2026-10-${dia}T12:00:00Z`,
    ...extra,
  };
}

function servidor(corpo: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })),
  );
}

function renderizar(rota = '/pedidos') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <App basePath="/" getToken={async () => 'token'} eventBus={criarEventBus(new EventTarget())} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

const numeros = () => within(screen.getByRole('list', { name: 'Pedidos' })).getAllByRole('link').map((l) => l.textContent ?? '');

describe('Meus pedidos', () => {
  it('lista do mais recente para o mais antigo, mesmo se o servidor mandar fora de ordem', async () => {
    servidor([pedido(3), pedido(9), pedido(5)]);
    renderizar();

    await screen.findByRole('list', { name: 'Pedidos' });
    const ordem = numeros();
    expect(ordem[0]).toContain('#00000009');
    expect(ordem[1]).toContain('#00000005');
    expect(ordem[2]).toContain('#00000003');
    expect(ordem[0]).toContain('Pago');
    expect(ordem[0]).toContain('R$');
  });

  it('pagina de 10 em 10 e a página some da lista ao avançar', async () => {
    servidor(Array.from({ length: 12 }, (_, i) => pedido(i + 1)));
    renderizar();

    await screen.findByRole('list', { name: 'Pedidos' });
    expect(numeros()).toHaveLength(POR_PAGINA);
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(numeros()).toHaveLength(2);
    expect(numeros()[0]).toContain('#00000002');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('filtra por status, volta para a página 1 e permite limpar o filtro', async () => {
    servidor([...Array.from({ length: 11 }, (_, i) => pedido(i + 1, 'PAGO')), pedido(20, 'CANCELADO')]);
    renderizar('/pedidos?pagina=2');

    await screen.findByRole('list', { name: 'Pedidos' });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelado' }));
    expect(screen.getByRole('button', { name: 'Cancelado' })).toHaveAttribute('aria-pressed', 'true');
    expect(numeros()).toHaveLength(1);
    expect(numeros()[0]).toContain('#00000020');
    expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(numeros()).toHaveLength(10);
  });

  it('avisa quando nenhum pedido tem o status escolhido', async () => {
    servidor([pedido(1, 'PAGO')]);
    renderizar();

    await screen.findByRole('list', { name: 'Pedidos' });
    await userEvent.click(screen.getByRole('button', { name: 'Entregue' }));
    expect(screen.getByText('Nenhum pedido entregue.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver todos os pedidos' }));
    expect(numeros()).toHaveLength(1);
  });

  it('mostra o estado vazio, com caminho para a loja, quando não há pedidos', async () => {
    servidor([]);
    renderizar();

    expect(await screen.findByText('Você ainda não fez nenhum pedido.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver produtos' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('group', { name: 'Filtrar por status' })).not.toBeInTheDocument();
  });

  it('mostra o erro e tenta de novo', async () => {
    servidor({ detail: 'falhou' }, 500);
    renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar seus pedidos.');
    servidor([pedido(1)]);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('list', { name: 'Pedidos' })).toBeInTheDocument();
  });

  it('cada pedido leva ao detalhe', async () => {
    servidor([pedido(7)]);
    renderizar();

    const link = (await screen.findAllByRole('link', { name: /Pedido #00000007/ }))[0];
    expect(link).toHaveAttribute('href', '/pedidos/00000007-aaaa-bbbb-cccc-dddddddddddd');
  });
});

describe('paginar e resumo', () => {
  it('corrige página fora do intervalo', () => {
    const lista = Array.from({ length: 12 }, (_, i) => pedido(i + 1));
    expect(paginar(lista, 99).pagina).toBe(2);
    expect(paginar(lista, 0).pagina).toBe(1);
    expect(paginar(lista, Number.NaN).pagina).toBe(1);
    expect(paginar([], 1)).toEqual({ itens: [], pagina: 1, totalDePaginas: 1 });
  });

  it('resume os itens do pedido', () => {
    const base = pedido(1);
    const outro = { ...base.itens[0], nome: 'Outro' };
    expect(resumoDosItens(base)).toBe('Produto 1');
    expect(resumoDosItens({ ...base, itens: [base.itens[0], outro] })).toBe('Produto 1 + 1 item');
    expect(resumoDosItens({ ...base, itens: [base.itens[0], outro, outro] })).toBe('Produto 1 + 2 itens');
  });
});
