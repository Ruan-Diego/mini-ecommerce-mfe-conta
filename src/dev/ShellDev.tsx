import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@ruan-diego/mini-design-system';
import { criarEventBus, type EventosMini, type NomeEvento, type PropsRemoto } from '@ruan-diego/mini-event-contracts';
import './shell-dev.css';

/** Record (e não array) para o TypeScript acusar se o contrato ganhar um evento e ele faltar aqui. */
const EVENTOS: Record<NomeEvento, true> = {
  'carrinho:adicionar-item': true,
  'carrinho:atualizado': true,
  'carrinho:limpo': true,
  'carrinho:abrir': true,
  'auth:alterado': true,
  navegar: true,
};
const NOMES_EVENTOS = Object.keys(EVENTOS) as NomeEvento[];

interface Registro {
  id: number;
  evento: NomeEvento;
  payload: EventosMini[NomeEvento];
}

interface Props {
  nome: string;
  App: ComponentType<PropsRemoto>;
  /** Alvo dos eventos. Padrão: window, como no shell de verdade. */
  alvo?: EventTarget;
}

/**
 * Shell falso para o modo standalone (só usado em src/bootstrap.tsx, nunca exposto).
 * Entrega ao MFE as mesmas props do shell real e mostra um painel com os eventos trocados,
 * além de botões para simular o que o shell faria (login, abrir carrinho).
 */
export function ShellDev({ nome, App, alvo = window }: Props) {
  const navigate = useNavigate();
  const eventBus = useMemo(() => criarEventBus(alvo), [alvo]);
  const [logado, setLogado] = useState(false);
  const [registros, setRegistros] = useState<Registro[]>([]);

  useEffect(() => {
    let id = 0;
    const cancelamentos = NOMES_EVENTOS.map((evento) =>
      eventBus.on(evento, (payload) => setRegistros((r) => [{ id: ++id, evento, payload }, ...r].slice(0, 20))),
    );
    return () => cancelamentos.forEach((cancelar) => cancelar());
  }, [eventBus]);

  // Como o shell: navegar leva para a rota pedida (aqui, dentro do próprio MFE).
  useEffect(() => eventBus.on('navegar', ({ rota }) => navigate(rota)), [eventBus, navigate]);

  const props = useMemo<PropsRemoto>(
    () => ({ basePath: '/', getToken: async () => (logado ? 'token-de-desenvolvimento' : null), eventBus }),
    [logado, eventBus],
  );

  function alternarLogin() {
    const novo = !logado;
    setLogado(novo);
    eventBus.emit('auth:alterado', novo ? { autenticado: true, nome: 'Cliente Dev', papeis: ['cliente'] } : { autenticado: false, papeis: [] });
  }

  return (
    <>
      <App {...props} />
      <aside className="shell-dev" aria-label="Shell de desenvolvimento">
        <details>
          <summary>
            <span className="mono">{nome}</span> · modo standalone · {registros.length} evento(s)
          </summary>
          <div className="shell-dev-acoes">
            <Button variante="secundario" pequeno onClick={alternarLogin} aria-pressed={logado}>
              {logado ? 'Simular logout' : 'Simular login'}
            </Button>
            <Button variante="secundario" pequeno onClick={() => eventBus.emit('carrinho:abrir', {})}>
              Emitir carrinho:abrir
            </Button>
            <Button variante="ghost" pequeno onClick={() => setRegistros([])}>
              Limpar
            </Button>
          </div>
          <ol className="shell-dev-log" aria-live="polite">
            {registros.map((r) => (
              <li key={r.id}>
                <span className="mono ac">{r.evento}</span> <code>{JSON.stringify(r.payload)}</code>
              </li>
            ))}
          </ol>
        </details>
      </aside>
    </>
  );
}
