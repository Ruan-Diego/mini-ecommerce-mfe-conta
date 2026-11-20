import type { EnderecoEntrega, Pedido, StatusPedido } from './api/pedidos';

/**
 * Endereços do cliente. Ainda não existe serviço de endereços, então eles ficam no localStorage, na MESMA chave
 * e no mesmo formato que o mfe-checkout usa ao salvar o endereço de uma compra (`mini:enderecos`: lista, o
 * principal primeiro, até 5). Os dois MFEs rodam na origem do shell e enxergam a mesma lista. É um contrato de
 * dados entre eles: os campos do checkout não mudam, e os da conta (`apelido`, `principal`) são opcionais, que
 * o checkout ignora. Quando houver serviço de endereços, só este arquivo (e o do checkout) muda.
 */
export interface Endereco {
  destinatario: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface EnderecoSalvo extends Endereco {
  apelido?: string;
  principal?: boolean;
}

export const CHAVE = 'mini:enderecos';
export const MAXIMO = 5;

export const ENDERECO_VAZIO: EnderecoSalvo = {
  apelido: '',
  destinatario: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
};

export type Erros = Partial<Record<keyof EnderecoSalvo, string>>;

export const soDigitos = (texto: string) => texto.replace(/\D/g, '');

/** CEP no formato 01310-100 (aceita só os dígitos). */
export const formatarCep = (cep: string) => {
  const d = soDigitos(cep).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

/** As mesmas regras do checkout: tudo obrigatório menos complemento e apelido; CEP com 8 dígitos; UF com 2 letras. */
export function validarEndereco(e: EnderecoSalvo): Erros {
  const erros: Erros = {};
  if (!e.destinatario.trim()) erros.destinatario = 'Informe o nome de quem vai receber.';
  if (soDigitos(e.cep).length !== 8) erros.cep = 'Informe um CEP com 8 dígitos.';
  if (!e.logradouro.trim()) erros.logradouro = 'Informe a rua.';
  if (!e.numero.trim()) erros.numero = 'Informe o número.';
  if (!e.bairro.trim()) erros.bairro = 'Informe o bairro.';
  if (!e.cidade.trim()) erros.cidade = 'Informe a cidade.';
  if (!/^[A-Za-z]{2}$/.test(e.uf.trim())) erros.uf = 'Informe a UF com 2 letras.';
  return erros;
}

function normalizar(e: EnderecoSalvo): EnderecoSalvo {
  return {
    apelido: e.apelido?.trim() ?? '',
    destinatario: e.destinatario.trim(),
    cep: soDigitos(e.cep),
    logradouro: e.logradouro.trim(),
    numero: e.numero.trim(),
    complemento: e.complemento.trim(),
    bairro: e.bairro.trim(),
    cidade: e.cidade.trim(),
    uf: e.uf.trim().toUpperCase(),
    principal: e.principal,
  };
}

/** Lista salva, com o principal marcado (o primeiro, se nenhum estiver). Sem localStorage, vem vazia. */
export function lerEnderecos(): EnderecoSalvo[] {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as EnderecoSalvo[];
    if (!Array.isArray(lista)) return [];
    const temPrincipal = lista.some((e) => e.principal);
    return lista.map((e, i) => ({ ...e, principal: temPrincipal ? Boolean(e.principal) : i === 0 }));
  } catch {
    return [];
  }
}

/** Grava com o principal na frente: é o que o checkout pré-seleciona. */
function gravar(lista: EnderecoSalvo[]): EnderecoSalvo[] {
  const ordenada = [...lista.filter((e) => e.principal), ...lista.filter((e) => !e.principal)];
  try {
    localStorage.setItem(CHAVE, JSON.stringify(ordenada));
  } catch {
    // sem armazenamento (modo privado): a mudança vale só nesta tela
  }
  return ordenada;
}

export function adicionarEndereco(novo: EnderecoSalvo): EnderecoSalvo[] {
  const lista = lerEnderecos();
  if (lista.length >= MAXIMO) throw new Error(`Você pode guardar até ${MAXIMO} endereços.`);
  return gravar([...lista, { ...normalizar(novo), principal: lista.length === 0 }]);
}

export function atualizarEndereco(indice: number, dados: EnderecoSalvo): EnderecoSalvo[] {
  const lista = lerEnderecos();
  return gravar(lista.map((e, i) => (i === indice ? { ...normalizar(dados), principal: e.principal } : e)));
}

/** Excluir o principal passa a marca para o próximo da lista. */
export function excluirEndereco(indice: number): EnderecoSalvo[] {
  const restantes = lerEnderecos().filter((_, i) => i !== indice);
  if (restantes.length > 0 && !restantes.some((e) => e.principal)) restantes[0] = { ...restantes[0], principal: true };
  return gravar(restantes);
}

export function tornarPrincipal(indice: number): EnderecoSalvo[] {
  return gravar(lerEnderecos().map((e, i) => ({ ...e, principal: i === indice })));
}

/** Pedido ainda não concluído: o endereço dele ainda pode ser usado na entrega. */
export const EM_ANDAMENTO: ReadonlySet<StatusPedido> = new Set(['AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_SEPARACAO', 'ENVIADO']);

const mesmoLugar = (a: Endereco | EnderecoEntrega, b: Endereco | EnderecoEntrega) =>
  soDigitos(a.cep) === soDigitos(b.cep) &&
  a.numero.trim().toLowerCase() === b.numero.trim().toLowerCase() &&
  a.logradouro.trim().toLowerCase() === b.logradouro.trim().toLowerCase() &&
  (a.complemento ?? '').trim().toLowerCase() === (b.complemento ?? '').trim().toLowerCase();

/** O pedido em andamento que entrega neste endereço, se houver: enquanto existir, o endereço não pode ser excluído. */
export function pedidoEmAndamentoNoEndereco(endereco: Endereco, pedidos: Pedido[]): Pedido | undefined {
  return pedidos.find((p) => EM_ANDAMENTO.has(p.status) && mesmoLugar(p.endereco, endereco));
}

/** Número curto do pedido para mostrar ao cliente (o id é um UUID). */
export const numeroDoPedido = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;
