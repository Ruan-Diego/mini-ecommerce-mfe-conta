/**
 * Cliente HTTP do mfe-conta, sempre pelo gateway: `VITE_API_URL` é a base (ex.: http://localhost:8080/api) e o
 * caminho leva o prefixo do serviço (`/pedidos`). O token vem do shell (`props.getToken`); toda rota da conta
 * exige login.
 */

/** Erro de HTTP com a explicação que o backend mandou (problem+json: detalhe). */
export class ErroDeApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/** Fonte do token do shell (`props.getToken`): null enquanto não há login. */
export type ObterToken = () => Promise<string | null>;

const baseUrl = () => (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Texto para mostrar ao cliente: o `detail` do problem+json quando existe, senão uma frase genérica. */
async function mensagemDoErro(resposta: Response): Promise<string> {
  try {
    const problema = (await resposta.json()) as { detail?: string };
    if (problema.detail) return problema.detail;
  } catch {
    // corpo vazio ou que não é JSON: cai na frase genérica
  }
  return `o servidor respondeu HTTP ${resposta.status}`;
}

export async function chamar<T>(
  metodo: 'GET' | 'POST',
  caminho: string,
  obterToken: ObterToken,
  sinal?: AbortSignal,
): Promise<T> {
  const cabecalhos: Record<string, string> = { Accept: 'application/json' };
  const token = await obterToken();
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  const resposta = await fetch(`${baseUrl()}${caminho}`, { method: metodo, headers: cabecalhos, signal: sinal });
  if (!resposta.ok) throw new ErroDeApi(resposta.status, await mensagemDoErro(resposta));
  return (await resposta.json()) as T;
}
