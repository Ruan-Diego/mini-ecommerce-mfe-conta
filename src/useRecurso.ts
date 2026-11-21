import { useCallback, useEffect, useMemo, useState } from 'react';

export type Recurso<T> =
  | { estado: 'carregando' }
  | { estado: 'erro'; mensagem: string; status?: number; tentarDeNovo: () => void }
  | { estado: 'pronto'; dados: T; recarregar: () => void };

/**
 * Busca um dado ao montar (e quando `chave` muda, ou no "tentar de novo"), cancelando a busca anterior.
 * Cada busca é uma "geração" (um objeto novo quando a chave muda): a resposta só vale para a geração que a pediu,
 * e enquanto a da geração atual não chega o estado é "carregando", sem dado velho na tela.
 */
export function useRecurso<T>(buscar: (sinal: AbortSignal) => Promise<T>, chave?: unknown): Recurso<T> {
  const [tentativa, setTentativa] = useState(0);
  const repetir = useCallback(() => setTentativa((t) => t + 1), []);
  // Objeto novo a cada mudança da chave ou nova tentativa: é a identidade da busca em curso.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `chave` e `tentativa` são justamente o gatilho
  const geracao = useMemo(() => ({}), [chave, tentativa]);
  const [resposta, setResposta] = useState<{ geracao: object; valor: Recurso<T> } | null>(null);

  useEffect(() => {
    const controle = new AbortController();
    buscar(controle.signal).then(
      (dados) => {
        if (!controle.signal.aborted) setResposta({ geracao, valor: { estado: 'pronto', dados, recarregar: repetir } });
      },
      (erro: unknown) => {
        if (controle.signal.aborted) return;
        const status = typeof erro === 'object' && erro && 'status' in erro ? Number(erro.status) : undefined;
        const mensagem = erro instanceof Error ? erro.message : 'falha desconhecida';
        console.error('[mfe-conta] falha ao buscar dados', erro);
        setResposta({ geracao, valor: { estado: 'erro', mensagem, status, tentarDeNovo: repetir } });
      },
    );
    return () => controle.abort();
    // `buscar` é recriada a cada render; quem decide quando buscar de novo é a geração.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geracao]);

  return resposta && resposta.geracao === geracao ? resposta.valor : { estado: 'carregando' };
}
