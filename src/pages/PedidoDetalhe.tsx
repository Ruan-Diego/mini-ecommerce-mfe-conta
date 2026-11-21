import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Modal, Pill } from '@ruan-diego/mini-design-system';
import { cancelarPedido, obterPedido, type Pedido } from '../api/pedidos';
import { useConta } from '../contexto';
import { numeroDoPedido } from '../enderecos';
import { PODE_CANCELAR, linhaDoTempo, textoDoPagamento } from '../linhaDoTempo';
import { ROTULO_STATUS, TOM_STATUS, formatarDataHora, formatarMoeda } from '../pedidosLista';
import { useRecurso } from '../useRecurso';

/** O carrinho aceita de 1 a 10 unidades por item. */
const MAXIMO_POR_ITEM = 10;

/**
 * Detalhe do pedido: linha do tempo, itens, endereço, pagamento e valores. Cancelar só aparece em
 * AGUARDANDO_PAGAMENTO e PAGO, com modal de confirmação; "Comprar novamente" emite `carrinho:adicionar-item` por
 * item (o drawer do carrinho trata o evento e abre sozinho), sem importar nada do mfe-carrinho.
 */
export function PedidoDetalhe() {
  const { id = '' } = useParams();
  const { getToken } = useConta();
  const pedido = useRecurso((sinal) => obterPedido(getToken, id, sinal), `${id}`);

  return (
    <section className="wrap conta-detalhe">
      <Link className="voltar" to="../pedidos">
        <span aria-hidden="true">←</span> Meus pedidos
      </Link>

      {pedido.estado === 'carregando' && <div className="card pedido-esqueleto detalhe-esqueleto" role="status" aria-label="Carregando pedido" />}

      {pedido.estado === 'erro' && (
        <div className="card estado-vazio" role="alert">
          {pedido.status === 404 ? (
            <>
              <p className="h4">Pedido não encontrado.</p>
              <p className="muted">Ele não existe ou não é da sua conta.</p>
            </>
          ) : (
            <>
              <p className="h4">Não foi possível carregar este pedido.</p>
              <Button onClick={pedido.tentarDeNovo}>Tentar de novo</Button>
            </>
          )}
        </div>
      )}

      {pedido.estado === 'pronto' && <Conteudo key={pedido.dados.id} inicial={pedido.dados} />}
    </section>
  );
}

function Conteudo({ inicial }: { inicial: Pedido }) {
  const { getToken, eventBus } = useConta();
  const [pedido, setPedido] = useState(inicial);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  async function cancelar() {
    if (cancelando) return;
    setCancelando(true);
    setErro('');
    try {
      setPedido(await cancelarPedido(getToken, pedido.id));
      setConfirmando(false);
      setAviso('Pedido cancelado.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível cancelar o pedido.');
    } finally {
      setCancelando(false);
    }
  }

  function comprarNovamente() {
    for (const item of pedido.itens) {
      eventBus.emit('carrinho:adicionar-item', {
        produtoId: item.produtoId,
        quantidade: Math.min(item.quantidade, MAXIMO_POR_ITEM),
      });
    }
    setAviso('Itens adicionados ao carrinho.');
  }

  return (
    <>
      <header className="detalhe-topo">
        <h1 className="h2 conta-titulo-menor">Pedido {numeroDoPedido(pedido.id)}</h1>
        <Pill tom={TOM_STATUS[pedido.status]}>{ROTULO_STATUS[pedido.status]}</Pill>
        <span className="muted">Feito em {formatarDataHora(pedido.criadoEm)}</span>
      </header>
      <p className="sr" role="status" aria-live="polite">
        {aviso}
      </p>

      <div className="detalhe-grade">
        <div className="detalhe-coluna">
          <div className="card detalhe-bloco">
            <h2 className="h3">Acompanhamento</h2>
            <ol className="tempo" aria-label="Linha do tempo do pedido">
              {linhaDoTempo(pedido).map((etapa) => (
                <li key={etapa.status} className={`tempo-${etapa.situacao}`} aria-current={etapa.situacao === 'atual' ? 'step' : undefined}>
                  <span className="tempo-ponto" aria-hidden="true" />
                  <span className="tempo-texto">
                    <span className="h4">{etapa.rotulo}</span>
                    {etapa.quando && <span className="muted">{formatarDataHora(etapa.quando)}</span>}
                    {etapa.situacao === 'pendente' && <span className="sr"> (ainda não aconteceu)</span>}
                  </span>
                </li>
              ))}
            </ol>
            {pedido.codigoRastreio && (
              <p>
                Código de rastreio: <span className="mono">{pedido.codigoRastreio}</span>
              </p>
            )}
          </div>

          <div className="card detalhe-bloco">
            <h2 className="h3">Itens</h2>
            <table className="itens-pedido">
              <caption className="sr">Itens do pedido</caption>
              <thead>
                <tr>
                  <th scope="col">Produto</th>
                  <th scope="col">Qtd.</th>
                  <th scope="col">Unitário</th>
                  <th scope="col">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedido.itens.map((item) => (
                  <tr key={item.produtoId}>
                    <th scope="row">{item.nome}</th>
                    <td>{item.quantidade}</td>
                    <td>{formatarMoeda(item.precoUnitario)}</td>
                    <td>{formatarMoeda(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="detalhe-coluna">
          <div className="card detalhe-bloco">
            <h2 className="h3">Entrega</h2>
            <address className="muted">
              {pedido.endereco.destinatario}
              <br />
              {pedido.endereco.logradouro}, {pedido.endereco.numero}
              {pedido.endereco.complemento ? `, ${pedido.endereco.complemento}` : ''}
              <br />
              {pedido.endereco.bairro} · {pedido.endereco.cidade}, {pedido.endereco.uf} · {pedido.endereco.cep}
            </address>
            <p className="muted">
              {pedido.frete.nome} · até {pedido.frete.prazoDias} {pedido.frete.prazoDias === 1 ? 'dia útil' : 'dias úteis'}
            </p>
          </div>

          <div className="card detalhe-bloco">
            <h2 className="h3">Pagamento</h2>
            <p>{textoDoPagamento(pedido.status)}</p>
            <dl className="valores">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatarMoeda(pedido.subtotal)}</dd>
              </div>
              <div>
                <dt>Frete</dt>
                <dd>{pedido.frete.valor === 0 ? 'Grátis' : formatarMoeda(pedido.frete.valor)}</dd>
              </div>
              <div className="valores-total">
                <dt>Total</dt>
                <dd>{formatarMoeda(pedido.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="detalhe-acoes">
            <Button onClick={comprarNovamente}>Comprar novamente</Button>
            {PODE_CANCELAR.has(pedido.status) && (
              <Button variante="secundario" onClick={() => setConfirmando(true)}>
                Cancelar pedido
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal aberto={confirmando} titulo="Cancelar este pedido?" aoFechar={() => !cancelando && setConfirmando(false)} rotuloFechar="Fechar">
        <p>
          O pedido {numeroDoPedido(pedido.id)} será cancelado
          {pedido.status === 'PAGO' ? ' e o pagamento será estornado' : ''}. Não dá para desfazer.
        </p>
        {erro && (
          <p role="alert" className="erro-modal">
            {erro}
          </p>
        )}
        <div className="form-acoes">
          <Button variante="secundario" onClick={() => setConfirmando(false)} disabled={cancelando}>
            Manter pedido
          </Button>
          <Button onClick={cancelar} disabled={cancelando}>
            {cancelando ? 'Cancelando…' : 'Sim, cancelar pedido'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
