import type { Pedido } from './api/pedidos';
import {
  adicionarEndereco,
  atualizarEndereco,
  CHAVE,
  ENDERECO_VAZIO,
  excluirEndereco,
  lerEnderecos,
  MAXIMO,
  pedidoEmAndamentoNoEndereco,
  tornarPrincipal,
  validarEndereco,
  type EnderecoSalvo,
} from './enderecos';

const casa: EnderecoSalvo = {
  ...ENDERECO_VAZIO,
  apelido: 'Casa',
  destinatario: 'Ana Souza',
  cep: '40020-000',
  logradouro: 'Rua Chile',
  numero: '120',
  complemento: 'ap. 302',
  bairro: 'Centro',
  cidade: 'Salvador',
  uf: 'ba',
};
const trabalho: EnderecoSalvo = { ...casa, apelido: 'Trabalho', cep: '41820020', logradouro: 'Av. Tancredo Neves', numero: '1632', complemento: '' };

beforeEach(() => localStorage.clear());

describe('endereços salvos', () => {
  it('o primeiro endereço vira o principal e é gravado normalizado', () => {
    const lista = adicionarEndereco(casa);

    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ principal: true, cep: '40020000', uf: 'BA', apelido: 'Casa' });
  });

  it('lê a lista que o checkout gravou (sem apelido nem principal) e marca o primeiro como principal', () => {
    const doCheckout = { destinatario: 'Ana Souza', cep: '40020000', logradouro: 'Rua Chile', numero: '120', complemento: 'ap. 302', bairro: 'Centro', cidade: 'Salvador', uf: 'BA' };
    localStorage.setItem(CHAVE, JSON.stringify([doCheckout, { ...doCheckout, numero: '9' }]));

    const lista = lerEnderecos();

    expect(lista.map((e) => e.principal)).toEqual([true, false]);
  });

  it('tornar principal leva o endereço para a frente da lista (o que o checkout pré-seleciona)', () => {
    adicionarEndereco(casa);
    adicionarEndereco(trabalho);

    const lista = tornarPrincipal(1);

    expect(lista[0]).toMatchObject({ apelido: 'Trabalho', principal: true });
    expect(lista[1]).toMatchObject({ apelido: 'Casa', principal: false });
    expect(JSON.parse(localStorage.getItem(CHAVE)!)[0].apelido).toBe('Trabalho');
  });

  it('excluir o principal passa a marca para o próximo', () => {
    adicionarEndereco(casa);
    adicionarEndereco(trabalho);

    const lista = excluirEndereco(0);

    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ apelido: 'Trabalho', principal: true });
  });

  it('editar mantém a marca de principal', () => {
    adicionarEndereco(casa);

    const lista = atualizarEndereco(0, { ...casa, numero: '121' });

    expect(lista[0]).toMatchObject({ numero: '121', principal: true });
  });

  it(`guarda no máximo ${MAXIMO} endereços`, () => {
    for (let i = 0; i < MAXIMO; i++) adicionarEndereco({ ...casa, numero: String(i + 1) });

    expect(() => adicionarEndereco(casa)).toThrow(/até 5/);
  });

  it('valida os campos como o checkout', () => {
    const erros = validarEndereco({ ...ENDERECO_VAZIO, cep: '123', uf: 'B' });

    expect(Object.keys(erros).sort()).toEqual(['bairro', 'cep', 'cidade', 'destinatario', 'logradouro', 'numero', 'uf']);
    expect(validarEndereco(casa)).toEqual({});
  });
});

describe('pedido em andamento no endereço', () => {
  const pedido = (status: Pedido['status'], complemento: string | null = 'AP. 302'): Pedido =>
    ({
      id: 'abcdef12-0000-4000-8000-000000000000',
      status,
      endereco: { destinatario: 'Ana', cep: '40020000', logradouro: 'rua chile', numero: '120', complemento, bairro: 'Centro', cidade: 'Salvador', uf: 'BA' },
    }) as Pedido;

  it.each(['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_SEPARACAO', 'ENVIADO'] as const)('%s bloqueia o endereço (comparação sem maiúsculas e sem hífen no CEP)', (status) => {
    expect(pedidoEmAndamentoNoEndereco(casa, [pedido(status)])?.status).toBe(status);
  });

  it.each(['ENTREGUE', 'CANCELADO'] as const)('%s não bloqueia', (status) => {
    expect(pedidoEmAndamentoNoEndereco(casa, [pedido(status)])).toBeUndefined();
  });

  it('outro complemento é outro endereço', () => {
    expect(pedidoEmAndamentoNoEndereco(casa, [pedido('PAGO', 'ap. 101')])).toBeUndefined();
    expect(pedidoEmAndamentoNoEndereco(trabalho, [pedido('PAGO', null)])).toBeUndefined();
  });
});
