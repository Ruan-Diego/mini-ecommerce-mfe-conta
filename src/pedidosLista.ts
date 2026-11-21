import type { Pedido, StatusPedido } from './api/pedidos';

/** Pedidos por página. A paginação é no cliente: o servidor devolve a lista inteira, do mais recente ao mais antigo. */
export const POR_PAGINA = 10;

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  EM_SEPARACAO: 'Em separação',
  ENVIADO: 'Enviado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const TOM_STATUS: Record<StatusPedido, 'neutro' | 'destaque' | 'aviso' | 'erro' | 'sucesso'> = {
  AGUARDANDO_PAGAMENTO: 'aviso',
  PAGO: 'destaque',
  EM_SEPARACAO: 'destaque',
  ENVIADO: 'destaque',
  ENTREGUE: 'sucesso',
  CANCELADO: 'erro',
};

export const STATUS_DO_FILTRO = Object.keys(ROTULO_STATUS) as StatusPedido[];

export const ehStatus = (valor: string | null): valor is StatusPedido => !!valor && valor in ROTULO_STATUS;

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarMoeda = (valor: number) => moeda.format(valor);

export const formatarData = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

/** Mais recentes primeiro (o servidor já ordena; reordenar aqui garante o critério de pronto mesmo se ele mudar). */
export const maisRecentesPrimeiro = (pedidos: Pedido[]) =>
  [...pedidos].sort((a, b) => Date.parse(b.criadoEm) - Date.parse(a.criadoEm));

export function filtrar(pedidos: Pedido[], status: StatusPedido | null) {
  return status ? pedidos.filter((p) => p.status === status) : pedidos;
}

export interface Pagina {
  itens: Pedido[];
  pagina: number;
  totalDePaginas: number;
}

/** Recorta a página pedida; número fora do intervalo (URL antiga, filtro que encolheu a lista) é corrigido. */
export function paginar(pedidos: Pedido[], pedida: number): Pagina {
  const totalDePaginas = Math.max(1, Math.ceil(pedidos.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number.isFinite(pedida) ? Math.trunc(pedida) : 1), totalDePaginas);
  return { itens: pedidos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), pagina, totalDePaginas };
}

/** "Fone Aurora" ou "Fone Aurora + 2 itens". */
export function resumoDosItens(pedido: Pedido) {
  const [primeiro, ...resto] = pedido.itens;
  if (!primeiro) return 'Sem itens';
  return resto.length === 0 ? primeiro.nome : `${primeiro.nome} + ${resto.length} ${resto.length === 1 ? 'item' : 'itens'}`;
}

export const formatarDataHora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
