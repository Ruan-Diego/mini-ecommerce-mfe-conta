import { NavLink, Outlet } from 'react-router-dom';

/**
 * Rota de layout das telas da conta: navegação lateral (Minha conta, Meus pedidos) e a tela da vez no <Outlet>.
 * Por ser uma rota sem caminho próprio, os links relativos ("." e "pedidos") resolvem a partir do basePath do MFE
 * (o shell monta a conta em /conta). Sair fica no header do shell, que é o dono do login.
 */
export function LayoutConta() {
  const classe = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : undefined);
  return (
    <section className="wrap conta">
      <nav aria-label="Conta" className="side conta-nav">
        <NavLink to="." end className={classe}>
          Minha conta
        </NavLink>
        <NavLink to="pedidos" end className={classe}>
          Meus pedidos
        </NavLink>
      </nav>
      <div className="conta-conteudo">
        <Outlet />
      </div>
    </section>
  );
}
