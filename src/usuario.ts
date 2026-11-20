/**
 * Dados do cliente que vêm do Keycloak, lidos do próprio token (o shell entrega o token, não o perfil).
 * Ler o payload do JWT no navegador serve só para mostrar: quem confia no token é o backend, que valida a assinatura.
 */
export interface Usuario {
  nome: string;
  email: string | null;
  /** Console de conta do Keycloak (issuer + /account), onde o cliente edita nome, e-mail e senha. */
  urlEdicao: string | null;
}

function decodificarBase64Url(texto: string): string {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(texto.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Nulo se o texto não for um JWT legível. */
export function lerUsuario(token: string | null): Usuario | null {
  const partes = token?.split('.') ?? [];
  if (partes.length !== 3) return null;
  try {
    const claims = JSON.parse(decodificarBase64Url(partes[1])) as Record<string, unknown>;
    const texto = (chave: string) => (typeof claims[chave] === 'string' && claims[chave] ? (claims[chave] as string) : null);
    const iss = texto('iss');
    return {
      nome: texto('name') ?? texto('given_name') ?? texto('preferred_username') ?? 'Cliente',
      email: texto('email'),
      urlEdicao: iss ? `${iss.replace(/\/$/, '')}/account` : null,
    };
  } catch {
    return null;
  }
}

/** Iniciais para o avatar: primeira e última palavra do nome. */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return '?';
  const primeira = palavras[0][0];
  const ultima = palavras.length > 1 ? palavras[palavras.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}
