import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Input } from '@ruan-diego/mini-design-system';
import { formatarCep, validarEndereco, type EnderecoSalvo, type Erros } from '../enderecos';

interface Props {
  titulo: string;
  inicial: EnderecoSalvo;
  onSalvar: (endereco: EnderecoSalvo) => void;
  onCancelar: () => void;
}

/** Formulário de novo endereço ou de edição. Valida antes de salvar e mostra cada erro no próprio campo. */
export function FormEndereco({ titulo, inicial, onSalvar, onCancelar }: Props) {
  const [dados, setDados] = useState<EnderecoSalvo>(inicial);
  const [erros, setErros] = useState<Erros>({});
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  const campo = (nome: keyof EnderecoSalvo) => ({
    value: String(dados[nome] ?? ''),
    erro: erros[nome],
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      setDados((d) => ({ ...d, [nome]: nome === 'cep' ? formatarCep(e.target.value) : e.target.value })),
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados = validarEndereco(dados);
    setErros(encontrados);
    if (Object.keys(encontrados).length === 0) onSalvar(dados);
  }

  return (
    <form className="card form-endereco" onSubmit={enviar} noValidate aria-labelledby="form-endereco-titulo">
      <h3 id="form-endereco-titulo" className="h4" ref={tituloRef} tabIndex={-1}>
        {titulo}
      </h3>
      <div className="form-grade">
        <div className="f-2">
          <Input label="Apelido (opcional)" placeholder="Casa, Trabalho…" {...campo('apelido')} />
        </div>
        <div className="f-4">
          <Input label="Quem recebe" autoComplete="name" {...campo('destinatario')} />
        </div>
        <div className="f-2">
          <Input label="CEP" inputMode="numeric" autoComplete="postal-code" {...campo('cep')} />
        </div>
        <div className="f-4">
          <Input label="Rua" autoComplete="address-line1" {...campo('logradouro')} />
        </div>
        <div className="f-2">
          <Input label="Número" {...campo('numero')} />
        </div>
        <div className="f-4">
          <Input label="Complemento (opcional)" autoComplete="address-line2" {...campo('complemento')} />
        </div>
        <div className="f-3">
          <Input label="Bairro" {...campo('bairro')} />
        </div>
        <div className="f-2">
          <Input label="Cidade" autoComplete="address-level2" {...campo('cidade')} />
        </div>
        <div>
          <Input label="UF" maxLength={2} autoComplete="address-level1" {...campo('uf')} />
        </div>
      </div>
      <div className="form-acoes">
        <Button type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit">Salvar endereço</Button>
      </div>
    </form>
  );
}
