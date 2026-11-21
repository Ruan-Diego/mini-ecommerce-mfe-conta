/**
 * Pedidos do cliente logado no pedido-service (o único serviço deste MFE). O dono é sempre o `sub` do token:
 * pedido de outro cliente responde 404.
 */
import { chamar, type ObterToken } from './http';

export type StatusPedido = 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'EM_SEPARACAO' | 'ENVIADO' | 'ENTREGUE' | 'CANCELADO';

export interface ItemPedido {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
}

export interface EnderecoEntrega {
  destinatario: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface Pedido {
  id: string;
  status: StatusPedido;
  itens: ItemPedido[];
  endereco: EnderecoEntrega;
  frete: { codigo: string; nome: string; valor: number; prazoDias: number };
  subtotal: number;
  total: number;
  /** Preenchido quando o pedido é enviado. */
  codigoRastreio: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

/** `GET /pedidos/meus`: do mais recente para o mais antigo. */
export const meusPedidos = (obterToken: ObterToken, sinal?: AbortSignal) =>
  chamar<Pedido[]>('GET', '/pedidos/pedidos/meus', obterToken, sinal);

export const obterPedido = (obterToken: ObterToken, id: string, sinal?: AbortSignal) =>
  chamar<Pedido>('GET', `/pedidos/pedidos/${encodeURIComponent(id)}`, obterToken, sinal);

/** O servidor recusa (422) se o status não permite cancelar; o motivo vem na mensagem do erro. */
export const cancelarPedido = (obterToken: ObterToken, id: string) =>
  chamar<Pedido>('POST', `/pedidos/pedidos/${encodeURIComponent(id)}/cancelar`, obterToken);
