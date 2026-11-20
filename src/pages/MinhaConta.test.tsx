import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { criarEventBus } from '@ruan-diego/mini-event-contracts';
import App from '../App';
import { CHAVE } from '../enderecos';

/** JWT só para ler (o MFE não valida assinatura): header.payload.assinatura em base64url. */
function token(claims: Record<string, unknown>) {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'RS256' })}.${b64(claims)}.assinatura`;
}

const TOKEN = token({ name: 'Ana Souza', email: 'ana@mini.dev', iss: 'http://localhost:8180/realms/mini' });

const enderecoCasa = {
  apelido: 'Casa',
  destinatario: 'Ana Souza',
  cep: '40020000',
  logradouro: 'Rua Chile',
  numero: '120',
  complemento: 'ap. 302',
  bairro: 'Centro',
  cidade: 'Salvador',
  uf: 'BA',
  principal: true,
};
const enderecoTrabalho = { ...enderecoCasa, apelido: 'Trabalho', cep: '41820020', logradouro: 'Av. Tancredo Neves', numero: '1632', complemento: '', principal: false };

function pedidosNoServidor(pedidos: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(pedidos), { status: 200, headers: { 'Content-Type': 'application/json' } })),
  );
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App basePath="/" getToken={async () => TOKEN} eventBus={criarEventBus(new EventTarget())} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Minha conta', () => {
  it('mostra os dados do Keycloak lidos do token, com link para editar no provedor', async () => {
    pedidosNoServidor([]);
    renderizar();

    expect(await screen.findByRole('heading', { level: 1, name: 'Olá, Ana.' })).toBeInTheDocument();
    expect(screen.getByText('ana@mini.dev')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Editar no provedor/ })).toHaveAttribute(
      'href',
      'http://localhost:8180/realms/mini/account',
    );
  });

  it('adiciona um endereço, valida os campos e salva na mesma lista do checkout', async () => {
    pedidosNoServidor([]);
    renderizar();
    await userEvent.click(await screen.findByRole('button', { name: '+ Novo endereço' }));
    const form = screen.getByRole('form', { name: 'Novo endereço' });

    await userEvent.click(within(form).getByRole('button', { name: 'Salvar endereço' }));
    expect(within(form).getByText('Informe um CEP com 8 dígitos.')).toBeInTheDocument();

    await userEvent.type(within(form).getByLabelText('Apelido (opcional)'), 'Casa');
    await userEvent.type(within(form).getByLabelText('Quem recebe'), 'Ana Souza');
    await userEvent.type(within(form).getByLabelText('CEP'), '40020000');
    await userEvent.type(within(form).getByLabelText('Rua'), 'Rua Chile');
    await userEvent.type(within(form).getByLabelText('Número'), '120');
    await userEvent.type(within(form).getByLabelText('Bairro'), 'Centro');
    await userEvent.type(within(form).getByLabelText('Cidade'), 'Salvador');
    await userEvent.type(within(form).getByLabelText('UF'), 'ba');
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar endereço' }));

    const cartao = await screen.findByRole('article', { name: 'Endereço Casa' });
    expect(within(cartao).getByText('Principal')).toBeInTheDocument();
    expect(within(cartao).getByText(/40020-000/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CHAVE)!)[0]).toMatchObject({ cep: '40020000', uf: 'BA' });
  });

  it('não deixa excluir endereço usado por pedido em andamento e diz por quê', async () => {
    localStorage.setItem(CHAVE, JSON.stringify([enderecoCasa, enderecoTrabalho]));
    pedidosNoServidor([
      { id: 'abcdef12-0000-4000-8000-000000000000', status: 'PAGO', endereco: { ...enderecoCasa, complemento: 'ap. 302' } },
    ]);
    renderizar();

    const casa = await screen.findByRole('article', { name: 'Endereço Casa' });
    expect(await within(casa).findByText('Não pode ser excluído: pedido #ABCDEF12 em andamento.')).toBeInTheDocument();
    expect(within(casa).getByRole('button', { name: 'Excluir' })).toBeDisabled();
    expect(screen.getByText('1 pedido em andamento')).toBeInTheDocument();

    const trabalho = screen.getByRole('article', { name: 'Endereço Trabalho' });
    await userEvent.click(within(trabalho).getByRole('button', { name: 'Excluir' }));
    await userEvent.click(within(trabalho).getByRole('button', { name: 'Sim, excluir' }));
    expect(screen.queryByRole('article', { name: 'Endereço Trabalho' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CHAVE)!)).toHaveLength(1);
  });

  it('enquanto os pedidos não carregaram, nenhum endereço pode ser excluído', async () => {
    localStorage.setItem(CHAVE, JSON.stringify([enderecoTrabalho]));
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    renderizar();

    const trabalho = await screen.findByRole('article', { name: 'Endereço Trabalho' });
    expect(within(trabalho).getByRole('button', { name: 'Excluir' })).toBeDisabled();
  });

  it('torna outro endereço o principal e edita mantendo a marca', async () => {
    localStorage.setItem(CHAVE, JSON.stringify([enderecoCasa, enderecoTrabalho]));
    pedidosNoServidor([]);
    renderizar();

    const trabalho = await screen.findByRole('article', { name: 'Endereço Trabalho' });
    await userEvent.click(within(trabalho).getByRole('button', { name: 'Tornar principal' }));
    expect(within(screen.getByRole('article', { name: 'Endereço Trabalho' })).getByText('Principal')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CHAVE)!)[0].apelido).toBe('Trabalho');

    await userEvent.click(within(screen.getByRole('article', { name: 'Endereço Casa' })).getByRole('button', { name: 'Editar' }));
    const form = screen.getByRole('form', { name: 'Editar endereço' });
    await userEvent.clear(within(form).getByLabelText('Número'));
    await userEvent.type(within(form).getByLabelText('Número'), '121');
    await userEvent.click(within(form).getByRole('button', { name: 'Salvar endereço' }));
    expect(within(await screen.findByRole('article', { name: 'Endereço Casa' })).getByText(/Rua Chile, 121/)).toBeInTheDocument();
  });

  it('a navegação da conta marca a tela atual e leva a Meus pedidos', async () => {
    pedidosNoServidor([]);
    renderizar();

    const nav = await screen.findByRole('navigation', { name: 'Conta' });
    expect(within(nav).getByRole('link', { name: 'Minha conta' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Meus pedidos' })).toHaveAttribute('href', '/pedidos');
  });
});
