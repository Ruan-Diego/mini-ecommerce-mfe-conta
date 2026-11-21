// Copia os contratos gerados pelos testes Pact (pacts/*.json) para o backend, onde ficam versionados e são
// verificados pelos serviços no ./gradlew build (ADR-0005 do backend). Rode depois de `pnpm test`:
//   pnpm pact:copiar            (backend em ../mini-ecommerce-backend)
//   pnpm pact:copiar <pasta>    (outro caminho para o repositório do backend)
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const origem = resolve('pacts');
const backend = resolve(process.argv[2] ?? '../mini-ecommerce-backend');
const destino = join(backend, 'contratos', 'pacts');

if (!existsSync(origem)) {
  console.error('Nenhum contrato em pacts/. Rode os testes antes (pnpm test).');
  process.exit(1);
}
if (!existsSync(join(backend, 'settings.gradle.kts'))) {
  console.error(`Não achei o repositório do backend em ${backend}.`);
  process.exit(1);
}
mkdirSync(destino, { recursive: true });
for (const arquivo of readdirSync(origem).filter((a) => a.endsWith('.json'))) {
  copyFileSync(join(origem, arquivo), join(destino, arquivo));
  console.log(`${arquivo} → ${destino}`);
}
