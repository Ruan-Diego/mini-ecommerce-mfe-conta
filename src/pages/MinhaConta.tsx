import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@ruan-diego/mini-design-system';
import { meusPedidos, type Pedido } from '../api/pedidos';
import { useConta } from '../contexto';
import {
  adicionarEndereco,
  atualizarEndereco,
  ENDERECO_VAZIO,
  EM_ANDAMENTO,
  excluirEndereco,
  formatarCep,
  lerEnderecos,
  MAXIMO,
  numeroDoPedido,
  pedidoEmAndamentoNoEndereco,
  tornarPrincipal,
  type EnderecoSalvo,
} from '../enderecos';
import { iniciais, lerUsuario, type Usuario } from '../usuario';
import { useRecurso } from '../useRecurso';
import { FormEndereco } from './FormEndereco';

/** null = nenhum formulário aberto; 'novo' = cadastro; número = edição daquele endereço. */
type Edicao = null | 'novo' | number;

/**
 * Minha conta: dados do Keycloak (lidos do token, com link para editar no provedor) e os endereços salvos.
 * Os pedidos do cliente são buscados para dois fins: o atalho "Meus pedidos" e a regra de não excluir endereço
 * usado por pedido em andamento.
 */
export function MinhaConta() {
  const { getToken } = useConta();
  const usuario = useRecurso<Usuario | null>(async () => lerUsuario(await getToken()), getToken);
  const pedidos = useRecurso((sinal) => meusPedidos(getToken, sinal), getToken);
  const [enderecos, setEnderecos] = useState<EnderecoSalvo[]>(() => lerEnderecos());
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [aviso, setAviso] = useState('');

  const listaDePedidos: Pedido[] = pedidos.estado === 'pronto' ? pedidos.dados : [];
  const emAndamento = listaDePedidos.filter((p) => EM_ANDAMENTO.has(p.status)).length;
  const dados = usuario.estado === 'pronto' ? usuario.dados : null;
  const primeiroNome = dados?.nome.split(/\s+/)[0];

  function salvar(endereco: EnderecoSalvo) {
    try {
      setEnderecos(edicao === 'novo' ? adicionarEndereco(endereco) : atualizarEndereco(edicao as number, endereco));
      setAviso(edicao === 'novo' ? 'Endereço adicionado.' : 'Endereço atualizado.');
      setEdicao(null);
    } catch (erro) {
      setAviso(erro instanceof Error ? erro.message : 'Não foi possível salvar o endereço.');
    }
  }

  function excluir(indice: number) {
    setEnderecos(excluirEndereco(indice));
    setEdicao(null);
    setAviso('Endereço excluído.');
  }

  function principal(indice: number) {
    setEnderecos(tornarPrincipal(indice));
    setAviso('Endereço principal alterado.');
  }

  return (
    <>
      <h1 className="h2 conta-titulo">{primeiroNome ? `Olá, ${primeiroNome}.` : 'Minha conta'}</h1>

      <div className="card perfil">
        <div className="perfil-avatar" aria-hidden="true">
          {iniciais(dados?.nome ?? '')}
        </div>
        <div className="perfil-dados">
          <span className="h3">{dados?.nome ?? 'Carregando…'}</span>
          {dados?.email && <span className="muted">{dados.email}</span>}
        </div>
        {dados?.urlEdicao && (
          <a className="btn btn-sec btn-sm" href={dados.urlEdicao} target="_blank" rel="noreferrer">
            Editar no provedor <span aria-hidden="true">↗</span>
            <span className="sr"> (abre em nova aba)</span>
          </a>
        )}
      </div>

      <div className="conta-secao">
        <h2 className="h3">Endereços</h2>
        <Button
          pequeno
          onClick={() => setEdicao('novo')}
          disabled={edicao !== null || enderecos.length >= MAXIMO}
          title={enderecos.length >= MAXIMO ? `Você pode guardar até ${MAXIMO} endereços.` : undefined}
        >
          + Novo endereço
        </Button>
      </div>
      <p className="sr" role="status" aria-live="polite">
        {aviso}
      </p>

      {edicao === 'novo' && (
        <FormEndereco titulo="Novo endereço" inicial={ENDERECO_VAZIO} onSalvar={salvar} onCancelar={() => setEdicao(null)} />
      )}

      {enderecos.length === 0 && edicao === null ? (
        <p className="muted">Nenhum endereço salvo ainda. Os endereços usados no checkout aparecem aqui.</p>
      ) : (
        <div className="grade-enderecos">
          {enderecos.map((endereco, indice) =>
            edicao === indice ? (
              <FormEndereco
                key={indice}
                titulo="Editar endereço"
                inicial={{ ...ENDERECO_VAZIO, ...endereco, cep: formatarCep(endereco.cep) }}
                onSalvar={salvar}
                onCancelar={() => setEdicao(null)}
              />
            ) : (
              <CartaoEndereco
                key={indice}
                endereco={endereco}
                pedidoEmAndamento={pedidoEmAndamentoNoEndereco(endereco, listaDePedidos)}
                pedidosCarregados={pedidos.estado === 'pronto'}
                bloqueado={edicao !== null}
                onEditar={() => setEdicao(indice)}
                onExcluir={() => excluir(indice)}
                onTornarPrincipal={() => principal(indice)}
              />
            ),
          )}
        </div>
      )}

      <div className="atalhos">
        <Link className="card atalho" to="pedidos">
          <span>
            <span className="h4">Meus pedidos</span>
            <span className="muted">
              {pedidos.estado === 'carregando'
                ? 'Carregando…'
                : pedidos.estado === 'erro'
                  ? 'Não foi possível carregar agora'
                  : emAndamento === 0
                    ? 'Nenhum pedido em andamento'
                    : `${emAndamento} ${emAndamento === 1 ? 'pedido' : 'pedidos'} em andamento`}
            </span>
          </span>
          <Seta />
        </Link>
      </div>
    </>
  );
}

interface PropsCartao {
  endereco: EnderecoSalvo;
  pedidoEmAndamento: Pedido | undefined;
  pedidosCarregados: boolean;
  bloqueado: boolean;
  onEditar: () => void;
  onExcluir: () => void;
  onTornarPrincipal: () => void;
}

/**
 * Um endereço salvo. Excluir fica desabilitado, com o motivo escrito ao lado, enquanto um pedido em andamento
 * entrega nele, e também enquanto os pedidos não carregaram (sem saber, não se arrisca).
 */
function CartaoEndereco({ endereco, pedidoEmAndamento, pedidosCarregados, bloqueado, onEditar, onExcluir, onTornarPrincipal }: PropsCartao) {
  const [confirmando, setConfirmando] = useState(false);
  const titulo = endereco.apelido || endereco.logradouro;
  const podeExcluir = pedidosCarregados && !pedidoEmAndamento;

  return (
    <article className={`card endereco${endereco.principal ? ' endereco-principal' : ''}`} aria-label={`Endereço ${titulo}`}>
      <div className="endereco-topo">
        <span className="h4">{titulo}</span>
        {endereco.principal && <span className="pill pill-ac">Principal</span>}
      </div>
      <span className="muted">
        {endereco.logradouro}, {endereco.numero}
        {endereco.complemento ? `, ${endereco.complemento}` : ''}
        <br />
        {endereco.bairro} · {endereco.cidade}, {endereco.uf} · {formatarCep(endereco.cep)}
        <br />
        {endereco.destinatario}
      </span>
      {confirmando ? (
        <div className="endereco-acoes" role="group" aria-label="Confirmar exclusão">
          <span>Excluir este endereço?</span>
          <Button pequeno variante="secundario" onClick={() => setConfirmando(false)}>
            Manter
          </Button>
          <Button pequeno variante="ghost" className="btn-perigo" onClick={onExcluir}>
            Sim, excluir
          </Button>
        </div>
      ) : (
        <div className="endereco-acoes">
          <Button pequeno variante="secundario" onClick={onEditar} disabled={bloqueado}>
            Editar
          </Button>
          {!endereco.principal && (
            <Button pequeno variante="ghost" onClick={onTornarPrincipal} disabled={bloqueado}>
              Tornar principal
            </Button>
          )}
          <Button
            pequeno
            variante="ghost"
            className={podeExcluir ? 'btn-perigo' : undefined}
            onClick={() => setConfirmando(true)}
            disabled={bloqueado || !podeExcluir}
            aria-describedby={pedidoEmAndamento ? `bloqueio-${endereco.cep}-${endereco.numero}` : undefined}
          >
            Excluir
          </Button>
        </div>
      )}
      {pedidoEmAndamento && (
        <span id={`bloqueio-${endereco.cep}-${endereco.numero}`} className="muted aviso-bloqueio">
          Não pode ser excluído: pedido {numeroDoPedido(pedidoEmAndamento.id)} em andamento.
        </span>
      )}
    </article>
  );
}

function Seta() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
