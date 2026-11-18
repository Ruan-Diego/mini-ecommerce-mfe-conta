# mini-ecommerce-mfe-conta

Microfrontend do **Mini E-commerce**, carregado pelo [shell](https://github.com/Ruan-Diego/mini-ecommerce-shell) via Module Federation.
Consome o **pedido-service** pelo [gateway](https://github.com/Ruan-Diego/mini-ecommerce-backend).

React 19 · TypeScript · Vite · `@module-federation/vite`

## Telas

| Rota (relativa ao basePath) | Tela |
| --- | --- |
| `(raiz)` | Minha conta |
| `pedidos` | Meus pedidos |
| `pedidos/:id` | Detalhe do pedido |

Cada tela tem uma issue com tarefas e critério de pronto, e um artboard no canvas de design.

## Contrato com o shell

- Expõe `./App` em `remoteEntry.js` (porta 5177 em dev).
- `./App` recebe `{ basePath, getToken, eventBus }` (tipos de `@ruan-diego/mini-event-contracts`).
- Fala com outros microfrontends só por eventos; nunca importa código deles.
- `react`, `react-dom` e `react-router-dom` são compartilhados como singleton.

## Rodando

Os pacotes `@ruan-diego/mini-design-system` e `@ruan-diego/mini-event-contracts` vêm do GitHub Packages, que exige token até para ler. Uma vez: `gh auth refresh -h github.com -s read:packages` e, no seu `~/.npmrc`, a linha `//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}`. Antes do install, no PowerShell: `$env:GITHUB_TOKEN = gh auth token`. Detalhes no README do [mini-ecommerce-ui](https://github.com/Ruan-Diego/mini-ecommerce-ui#consumindo-nos-microfrontends).

```bash
pnpm install
pnpm dev        # standalone em http://localhost:5177
pnpm lint
pnpm typecheck
pnpm test
pnpm build      # gera dist/remoteEntry.js
```

Para ver dentro do shell, rode `pnpm build && pnpm preview` aqui e `pnpm dev` no shell.

### Modo standalone

O `pnpm dev` monta o `./App` dentro de um shell falso (`src/dev/ShellDev.tsx`), que passa as mesmas props do shell real e mostra um painel no canto da tela:

- lista os eventos do contrato que passam pelo event bus (o que o MFE emite e o que o painel simula);
- **Simular login/logout** emite `auth:alterado` e faz `getToken()` devolver um token de desenvolvimento;
- **Emitir carrinho:abrir** simula o clique no carrinho do header;
- o evento `navegar` troca de rota, como o shell faria.

O `ShellDev` só existe no `bootstrap.tsx`; o shell real importa apenas o `./App`.

Para ver dentro do shell, rode `pnpm build && pnpm preview` aqui e `pnpm dev` no shell.
