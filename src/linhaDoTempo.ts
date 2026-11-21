import type { Pedido, StatusPedido } from './api/pedidos';

export interface Etapa {
  status: StatusPedido;
  rotulo: string;
  situacao: 'feita' | 'atual' | 'pendente';
  /** Só as etapas com data conhecida: o contrato traz `criadoEm` e `atualizadoEm`, não o histórico. */
  quando: string | null;
}

const CAMINHO: { status: StatusPedido; rotulo: string }[] = [
  { status: 'AGUARDANDO_PAGAMENTO', rotulo: 'Pedido criado' },
  { status: 'PAGO', rotulo: 'Pagamento confirmado' },
  { status: 'EM_SEPARACAO', rotulo: 'Em separação' },
  { status: 'ENVIADO', rotulo: 'Enviado' },
  { status: 'ENTREGUE', rotulo: 'Entregue' },
];

/** Só nestes status o servidor aceita cancelar (as demais transições dão 422). */
export const PODE_CANCELAR: ReadonlySet<StatusPedido> = new Set(['AGUARDANDO_PAGAMENTO', 'PAGO']);

/**
 * Linha do tempo derivada do status atual (o pedido-service não expõe o histórico). O caminho feliz tem 5 etapas;
 * cancelado não sabe até onde chegou, então mostra só "Pedido criado" e "Cancelado". A data da etapa atual é
 * `atualizadoEm`; a da primeira, `criadoEm`.
 */
export function linhaDoTempo(pedido: Pedido): Etapa[] {
  if (pedido.status === 'CANCELADO') {
    return [
      { status: 'AGUARDANDO_PAGAMENTO', rotulo: 'Pedido criado', situacao: 'feita', quando: pedido.criadoEm },
      { status: 'CANCELADO', rotulo: 'Cancelado', situacao: 'atual', quando: pedido.atualizadoEm },
    ];
  }
  const atual = CAMINHO.findIndex((e) => e.status === pedido.status);
  return CAMINHO.map((etapa, i) => ({
    ...etapa,
    situacao: i < atual ? 'feita' : i === atual ? 'atual' : 'pendente',
    quando: i === 0 ? pedido.criadoEm : i === atual ? pedido.atualizadoEm : null,
  }));
}

/** Situação do pagamento em palavras do cliente, derivada do status (a conta não consulta o pagamento-service). */
export function textoDoPagamento(status: StatusPedido): string {
  if (status === 'AGUARDANDO_PAGAMENTO') return 'Aguardando pagamento';
  if (status === 'CANCELADO') return 'Pedido cancelado. Se houve cobrança, o valor é estornado.';
  return 'Pagamento confirmado';
}
