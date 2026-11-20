import { createContext, useContext, type ReactNode } from 'react';
import { criarEventBus, type EventBus } from '@ruan-diego/mini-event-contracts';
import type { ObterToken } from './api/http';

interface Conta {
  /** Token do shell (props.getToken): null enquanto não há login. */
  getToken: ObterToken;
  eventBus: EventBus;
}

const Contexto = createContext<Conta>({ getToken: async () => null, eventBus: criarEventBus() });

/** Entrega às telas o que o shell passou ao ./App, sem repassar props tela a tela. */
export function ContaProvider({ getToken, eventBus, children }: Conta & { children: ReactNode }) {
  return <Contexto.Provider value={{ getToken, eventBus }}>{children}</Contexto.Provider>;
}

export const useConta = () => useContext(Contexto);
