interface Props {
  tela: string;
}

/** Marcador de tela ainda não implementada. Cada tela tem uma issue "Tela: <nome>" neste repositório. */
export function EmConstrucao({ tela }: Props) {
  return (
    <section className="wrap" style={{ padding: '72px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span className="eyebrow">mfe-conta · Fase 6 — Conta, admin e qualidade</span>
      <h1 className="h2">{tela}</h1>
      <p className="muted">Tela a implementar. Veja a issue “Tela: {tela}” e o artboard correspondente no canvas.</p>
    </section>
  );
}
