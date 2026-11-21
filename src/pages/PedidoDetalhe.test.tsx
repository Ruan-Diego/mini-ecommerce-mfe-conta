import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { criarEventBus } from '@ruan-diego/mini-event-contracts';
import App from '../App';
import type { Pedido, StatusPedido } from '../api/pedidos';
import { linhaDoTempo } from '../linhaDoTempo';

const ID = '22222222-aaaa-bbbb-cccc-dddddddddddd';

function pedido(status: StatusPedido, extra: Partial<Pedido> = {}): Pedido {
  return {
    id: ID,
    status,
    itens: [
      { produtoId: 'p1', nome: 'Esfera Chrome', precoUnitario: 100, quantidade: 2, subtotal: 200 },
      { produtoId: 'p2', nome: 'Cubo Fosco', precoUnitario: 50, quantidade: 12, subtotal: 600 },
    ],
    endereco: { destinatario: 'Ana Souza', cep: '40020000', logradouro: 'Rua Chile', numero: '120', complemento: 'ap. 302', bairro: 'Centro', cidade: 'Salvador', uf: 'BA' },
    frete: { codigo: 'padrao', nome: 'Padrão', valor: 19.9, prazoDias: 5 },
    subtotal: 800,
    total: 819.9,
    codigoRastreio: null,
    criadoEm: '2026-10-01T12:00:00Z',
    atualizadoEm: '2026-10-02T15:30:00Z',
    ...extra,
  };
}

interface Chamada {
  metodo: string;
  url: string;
}

/** Servidor falso: GET devolve o pedido; POST /cancelar responde com o que o teste mandar. */
function servidor(inicial: Pedido, aoCancelar?: () => Response) {
  const chamadas: Chamada[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? 'GET';
      chamadas.push({ metodo, url });
      if (metodo === 'POST') return aoCancelar!();
      return new Response(JSON.stringify(inicial), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
  return chamadas;
}

function renderizar(eventBus = criarEventBus(new EventTarget())) {
  render(
    <MemoryRouter initialEntries={[`/pedidos/${ID}`]}>
      <App basePath="/" getToken={async () => 'token'} eventBus={eventBus} />
    </MemoryRouter>,
  );
  return eventBus;
}

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe('Detalhe do pedido', () => {
  it('mostra linha do tempo, itens, entrega, pagamento e valores', async () => {
    servidor(pedido('EM_SEPARACAO'));
    renderizar();

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido #22222222' })).toBeInTheDocument();
    const tempo = screen.getByRole('list', { name: 'Linha do tempo do pedido' });
    const atual = within(tempo).getAllByRole('listitem').find((li) => li.getAttribute('aria-current') === 'step');
    expect(atual).toHaveTextContent('Em separação');
    expect(within(tempo).getByText('Enviado').closest('li')).toHaveTextContent('ainda não aconteceu');

    const itens = screen.getByRole('table', { name: 'Itens do pedido' });
    expect(within(itens).getByRole('rowheader', { name: 'Esfera Chrome' })).toBeInTheDocument();
    expect(screen.getByText(/Rua Chile, 120, ap\. 302/)).toBeInTheDocument();
    const pagamento = screen.getByRole('heading', { name: 'Pagamento' }).closest('.card') as HTMLElement;
    expect(within(pagamento).getByText('Pagamento confirmado')).toBeInTheDocument();
    expect(screen.getByText('Total').nextSibling).toHaveTextContent(/819,90/);
  });

  it('mostra o código de rastreio quando existe', async () => {
    servidor(pedido('ENVIADO', { codigoRastreio: 'BR123456789' }));
    renderizar();
    expect(await screen.findByText('BR123456789')).toBeInTheDocument();
  });

  it.each([
    ['AGUARDANDO_PAGAMENTO', true],
    ['PAGO', true],
    ['EM_SEPARACAO', false],
    ['ENVIADO', false],
    ['ENTREGUE', false],
    ['CANCELADO', false],
  ] as const)('botão Cancelar com o pedido %s: %s', async (status, aparece) => {
    servidor(pedido(status));
    renderizar();
    await screen.findByRole('heading', { level: 1 });
    expect(!!screen.queryByRole('button', { name: 'Cancelar pedido' })).toBe(aparece);
  });

  it('cancela depois de confirmar no modal e passa a mostrar Cancelado, sem o botão', async () => {
    const chamadas = servidor(pedido('PAGO'), () => json(pedido('CANCELADO')));
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar pedido' }));
    const modal = screen.getByRole('dialog', { name: 'Cancelar este pedido?' });
    expect(modal).toHaveTextContent('o pagamento será estornado');
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false);

    await userEvent.click(within(modal).getByRole('button', { name: 'Sim, cancelar pedido' }));

    expect(await screen.findByText('Cancelado', { selector: '.pill' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument();
    const posts = chamadas.filter((c) => c.metodo === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toMatch(new RegExp(`/pedidos/pedidos/${ID}/cancelar$`));
  });

  it('"Manter pedido" fecha o modal sem chamar o servidor', async () => {
    const chamadas = servidor(pedido('AGUARDANDO_PAGAMENTO'));
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar pedido' }));
    await userEvent.click(screen.getByRole('button', { name: 'Manter pedido' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false);
  });

  it('cancelamento recusado (422) mostra o motivo no modal e mantém o pedido', async () => {
    servidor(pedido('PAGO'), () => json({ detail: 'transição de ENVIADO para CANCELADO não é permitida' }, 422));
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar pedido' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim, cancelar pedido' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('transição de ENVIADO para CANCELADO não é permitida');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Pago', { selector: '.pill' })).toBeInTheDocument();
  });

  it('Comprar novamente emite carrinho:adicionar-item por item, no máximo 10 por item', async () => {
    servidor(pedido('ENTREGUE'));
    const bus = criarEventBus(new EventTarget());
    const vistos: { produtoId: string; quantidade: number }[] = [];
    bus.on('carrinho:adicionar-item', (p) => vistos.push(p));
    renderizar(bus);

    await userEvent.click(await screen.findByRole('button', { name: 'Comprar novamente' }));

    expect(vistos).toEqual([
      { produtoId: 'p1', quantidade: 2 },
      { produtoId: 'p2', quantidade: 10 },
    ]);
  });

  it('pedido de outro cliente (404) mostra "não encontrado"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'pedido não encontrado' }, 404)));
    renderizar();
    expect(await screen.findByText('Pedido não encontrado.')).toBeInTheDocument();
  });

  it('o link Meus pedidos volta para a lista', async () => {
    servidor(pedido('PAGO'));
    renderizar();
    expect(await screen.findByRole('link', { name: /Meus pedidos/ })).toHaveAttribute('href', '/pedidos');
  });
});

describe('linhaDoTempo', () => {
  it('cancelado mostra só criado e cancelado', () => {
    expect(linhaDoTempo(pedido('CANCELADO')).map((e) => [e.rotulo, e.situacao])).toEqual([
      ['Pedido criado', 'feita'],
      ['Cancelado', 'atual'],
    ]);
  });

  it('entregue deixa as 4 primeiras feitas e a última atual', () => {
    expect(linhaDoTempo(pedido('ENTREGUE')).map((e) => e.situacao)).toEqual(['feita', 'feita', 'feita', 'feita', 'atual']);
  });
});
