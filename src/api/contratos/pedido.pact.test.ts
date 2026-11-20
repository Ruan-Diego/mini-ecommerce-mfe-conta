// @vitest-environment node
/**
 * Contrato (Pact) do mfe-conta com o pedido-service: uma interação para cada chamada HTTP do MFE (meus pedidos,
 * detalhe e cancelar), com os casos que as telas tratam (lista vazia, pedido de outro cliente, cancelamento
 * recusado). Grava pacts/mfe-conta-pedido-service.json; `pnpm pact:copiar` leva ao backend (ADR-0005).
 *
 * O MFE chama pelo caminho do gateway (/pedidos/pedidos/...): o teste do provider tira o prefixo /pedidos.
 */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import { cancelarPedido, meusPedidos, obterPedido } from '../pedidos';
import type { ErroDeApi } from '../http';

const { eachLike, like, number, integer, string, uuid, regex } = MatchersV3;

// O Pact mescla com o arquivo que já existe: apagar antes garante que interação removida daqui some do contrato.
const pastaDosPacts = path.resolve(process.cwd(), 'pacts');
rmSync(path.join(pastaDosPacts, 'mfe-conta-pedido-service.json'), { force: true });

const provider = new PactV3({ consumer: 'mfe-conta', provider: 'pedido-service', dir: pastaDosPacts, logLevel: 'warn' });

const PEDIDO = '22222222-2222-4222-8222-222222222222';
const DE_OUTRO = '44444444-4444-4444-8444-444444444444';
const PRODUTO = '11111111-1111-4111-8111-111111111111';
const obterToken = async () => 'token-pact';
const CABECALHOS = { Accept: 'application/json', Authorization: regex(/Bearer .+/.source, 'Bearer token-pact') };
const JSON_UTF8 = regex(/application\/json.*/.source, 'application/json');
const PROBLEMA = regex(/application\/(problem\+)?json.*/.source, 'application/problem+json');
const instante = (exemplo: string) => regex(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/.source, exemplo);

/** O pedido como as telas da conta leem: status, itens, endereço, frete, valores e datas. */
const pedido = (status: string) => ({
  id: uuid(PEDIDO),
  status: regex(/AGUARDANDO_PAGAMENTO|PAGO|EM_SEPARACAO|ENVIADO|ENTREGUE|CANCELADO/.source, status),
  itens: eachLike({
    produtoId: uuid(PRODUTO),
    nome: string('Esfera Chrome'),
    precoUnitario: number(100.0),
    quantidade: integer(2),
    subtotal: number(200.0),
  }),
  endereco: like({
    destinatario: string('Ana Souza'),
    cep: string('01310100'),
    logradouro: string('Av. Paulista'),
    numero: string('1000'),
    bairro: string('Bela Vista'),
    cidade: string('São Paulo'),
    uf: string('SP'),
  }),
  frete: like({ codigo: string('padrao'), nome: string('Padrão'), valor: number(19.9), prazoDias: integer(7) }),
  subtotal: number(200.0),
  total: number(219.9),
  criadoEm: instante('2026-11-20T12:00:00Z'),
  atualizadoEm: instante('2026-11-20T12:00:00Z'),
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('contrato mfe-conta → pedido-service', () => {
  it('lista os pedidos do cliente', async () => {
    provider
      .given('existe o pedido 22222222-2222-4222-8222-222222222222 do cliente logado')
      .uponReceiving('a lista dos pedidos do cliente')
      .withRequest({ method: 'GET', path: '/pedidos/pedidos/meus', headers: CABECALHOS })
      .willRespondWith({ status: 200, headers: { 'Content-Type': JSON_UTF8 }, body: eachLike(pedido('PAGO')) });

    await provider.executeTest(async (mock) => {
      vi.stubEnv('VITE_API_URL', mock.url);
      const lista = await meusPedidos(obterToken);
      expect(lista[0].id).toBe(PEDIDO);
      expect(lista[0].itens[0].nome).toBe('Esfera Chrome');
    });
  });

  it('cliente sem pedidos recebe a lista vazia (estado vazio da tela)', async () => {
    provider
      .given('o cliente logado não tem pedidos')
      .uponReceiving('a lista dos pedidos de um cliente sem pedidos')
      .withRequest({ method: 'GET', path: '/pedidos/pedidos/meus', headers: CABECALHOS })
      .willRespondWith({ status: 200, headers: { 'Content-Type': JSON_UTF8 }, body: [] });

    await provider.executeTest(async (mock) => {
      vi.stubEnv('VITE_API_URL', mock.url);
      expect(await meusPedidos(obterToken)).toEqual([]);
    });
  });

  it('lê o detalhe de um pedido do cliente', async () => {
    provider
      .given('existe o pedido 22222222-2222-4222-8222-222222222222 do cliente logado')
      .uponReceiving('o detalhe de um pedido do cliente')
      .withRequest({ method: 'GET', path: `/pedidos/pedidos/${PEDIDO}`, headers: CABECALHOS })
      .willRespondWith({ status: 200, headers: { 'Content-Type': JSON_UTF8 }, body: pedido('PAGO') });

    await provider.executeTest(async (mock) => {
      vi.stubEnv('VITE_API_URL', mock.url);
      const lido = await obterPedido(obterToken, PEDIDO);
      expect(lido.status).toBe('PAGO');
      expect(lido.endereco.cidade).toBe('São Paulo');
    });
  });

  it('pedido de outro cliente é 404 (não revela que existe)', async () => {
    provider
      .given('o pedido 44444444-4444-4444-8444-444444444444 é de outro cliente')
      .uponReceiving('o detalhe de um pedido de outro cliente')
      .withRequest({ method: 'GET', path: `/pedidos/pedidos/${DE_OUTRO}`, headers: CABECALHOS })
      .willRespondWith({ status: 404 });

    await provider.executeTest(async (mock) => {
      vi.stubEnv('VITE_API_URL', mock.url);
      await expect(obterPedido(obterToken, DE_OUTRO)).rejects.toMatchObject({ status: 404 } satisfies Partial<ErroDeApi>);
    });
  });

  it('cancela um pedido aguardando pagamento', async () => {
    provider
      .given('o pedido 22222222-2222-4222-8222-222222222222 do cliente logado está aguardando pagamento')
      .uponReceiving('o cancelamento de um pedido aguardando pagamento')
      .withRequest({ method: 'POST', path: `/pedidos/pedidos/${PEDIDO}/cancelar`, headers: CABECALHOS })
      .willRespondWith({ status: 200, headers: { 'Content-Type': JSON_UTF8 }, body: { ...pedido('CANCELADO'), status: 'CANCELADO' } });

    await provider.executeTest(async (mock) => {
      vi.stubEnv('VITE_API_URL', mock.url);
      const cancelado = await cancelarPedido(obterToken, PEDIDO);
      expect(cancelado.status).toBe('CANCELADO');
    });
  });

  it('cancelar um pedido já enviado é recusado com o motivo', async () => {
    provider
      .given('o pedido 22222222-2222-4222-8222-222222222222 do cliente logado já foi enviado')
      .uponReceiving('o cancelamento de um pedido já enviado')
      .withRequest({ method: 'POST', path: `/pedidos/pedidos/${PEDIDO}/cancelar`, headers: CABECALHOS })
      .willRespondWith({
        status: 422,
        headers: { 'Content-Type': PROBLEMA },
        body: like({ detail: string('transição de ENVIADO para CANCELADO não é permitida') }),
      });

    await provider.executeTest(async (mock) => {
      vi.stubEnv('VITE_API_URL', mock.url);
      await expect(cancelarPedido(obterToken, PEDIDO)).rejects.toMatchObject({ status: 422 } satisfies Partial<ErroDeApi>);
    });
  });
});
