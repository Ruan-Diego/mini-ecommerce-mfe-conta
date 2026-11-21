import { Link, useSearchParams } from 'react-router-dom';
import { Button, Chip, Pill } from '@ruan-diego/mini-design-system';
import { meusPedidos, type StatusPedido } from '../api/pedidos';
import { useConta } from '../contexto';
import { numeroDoPedido } from '../enderecos';
import {
  ROTULO_STATUS,
  STATUS_DO_FILTRO,
  TOM_STATUS,
  ehStatus,
  filtrar,
  formatarData,
  formatarMoeda,
  maisRecentesPrimeiro,
  paginar,
  resumoDosItens,
} from '../pedidosLista';
import { useRecurso } from '../useRecurso';

/**
 * Meus pedidos: lista paginada (10 por página) com filtro por status, do mais recente para o mais antigo.
 * Filtro e página moram na query string (`?status=PAGO&pagina=2`): voltar do detalhe cai no mesmo ponto da lista.
 * Filtrar e paginar é no cliente porque o contrato `GET /pedidos/meus` devolve a lista inteira (decisão do item 57).
 */
export function Pedidos() {
  const { getToken } = useConta();
  const pedidos = useRecurso((sinal) => meusPedidos(getToken, sinal), getToken);
  const [params, setParams] = useSearchParams();
  const status: StatusPedido | null = ehStatus(params.get('status')) ? (params.get('status') as StatusPedido) : null;

  function mudar(proximo: Record<string, string | null>) {
    const novo = new URLSearchParams(params);
    for (const [chave, valor] of Object.entries(proximo)) {
      if (valor === null) novo.delete(chave);
      else novo.set(chave, valor);
    }
    setParams(novo);
  }

  return (
    <>
      <h1 className="h2 conta-titulo-menor">Meus pedidos</h1>

      {pedidos.estado === 'carregando' && (
        <div className="lista-pedidos" role="status" aria-label="Carregando pedidos">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card pedido-esqueleto" aria-hidden="true" />
          ))}
        </div>
      )}

      {pedidos.estado === 'erro' && (
        <div className="card estado-vazio" role="alert">
          <p className="h4">Não foi possível carregar seus pedidos.</p>
          <p className="muted">Tente de novo em instantes.</p>
          <Button onClick={pedidos.tentarDeNovo}>Tentar de novo</Button>
        </div>
      )}

      {pedidos.estado === 'pronto' && (
        <Lista
          todos={maisRecentesPrimeiro(pedidos.dados)}
          status={status}
          pagina={Number(params.get('pagina') ?? 1)}
          onStatus={(s) => mudar({ status: s, pagina: null })}
          onPagina={(p) => mudar({ pagina: p === 1 ? null : String(p) })}
        />
      )}
    </>
  );
}

interface PropsLista {
  todos: ReturnType<typeof maisRecentesPrimeiro>;
  status: StatusPedido | null;
  pagina: number;
  onStatus: (status: StatusPedido | null) => void;
  onPagina: (pagina: number) => void;
}

function Lista({ todos, status, pagina: pedida, onStatus, onPagina }: PropsLista) {
  if (todos.length === 0) {
    return (
      <div className="card estado-vazio">
        <p className="h4">Você ainda não fez nenhum pedido.</p>
        <p className="muted">Quando comprar, seus pedidos aparecem aqui.</p>
        <Link className="btn btn-pri" to="/">
          Ver produtos
        </Link>
      </div>
    );
  }

  const filtrados = filtrar(todos, status);
  const { itens, pagina, totalDePaginas } = paginar(filtrados, pedida);

  return (
    <>
      <div className="filtros-pedidos" role="group" aria-label="Filtrar por status">
        <Chip ativo={status === null} onClick={() => onStatus(null)}>
          Todos
        </Chip>
        {STATUS_DO_FILTRO.map((s) => (
          <Chip key={s} ativo={status === s} onClick={() => onStatus(s)}>
            {ROTULO_STATUS[s]}
          </Chip>
        ))}
      </div>

      <p className="sr" role="status" aria-live="polite">
        {filtrados.length} {filtrados.length === 1 ? 'pedido' : 'pedidos'}
      </p>

      {filtrados.length === 0 ? (
        <div className="card estado-vazio">
          <p className="h4">Nenhum pedido {ROTULO_STATUS[status as StatusPedido].toLowerCase()}.</p>
          <Button variante="secundario" onClick={() => onStatus(null)}>
            Ver todos os pedidos
          </Button>
        </div>
      ) : (
        <ol className="lista-pedidos" aria-label="Pedidos">
          {itens.map((pedido) => (
            <li key={pedido.id}>
              <Link className="card pedido-linha" to={pedido.id}>
                <span className="pedido-info">
                  <span className="h4">Pedido {numeroDoPedido(pedido.id)}</span>
                  <span className="muted">
                    {formatarData(pedido.criadoEm)} · {resumoDosItens(pedido)}
                  </span>
                </span>
                <Pill tom={TOM_STATUS[pedido.status]}>{ROTULO_STATUS[pedido.status]}</Pill>
                <span className="pedido-total">{formatarMoeda(pedido.total)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {totalDePaginas > 1 && (
        <nav className="paginacao" aria-label="Paginação">
          <Button variante="secundario" pequeno disabled={pagina === 1} onClick={() => onPagina(pagina - 1)}>
            Anterior
          </Button>
          <span aria-live="polite">
            Página {pagina} de {totalDePaginas}
          </span>
          <Button variante="secundario" pequeno disabled={pagina === totalDePaginas} onClick={() => onPagina(pagina + 1)}>
            Próxima
          </Button>
        </nav>
      )}
    </>
  );
}
