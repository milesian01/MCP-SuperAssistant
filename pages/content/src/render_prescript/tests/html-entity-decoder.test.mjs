import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const decoderPath = path.resolve(__dirname, '../src/utils/htmlEntityDecoder.ts');

let source = await readFile(decoderPath, 'utf8');
source = source
  .replace(/: Record<string, string>/g, '')
  .replace(/: string \| null/g, '')
  .replace(/: string/g, '')
  .replace(/export\s+/g, '');

const script = new vm.Script(`${source}\nmodule.exports = { decodeMcpLiteral };`, {
  filename: 'htmlEntityDecoder.ts',
});

const require = createRequire(import.meta.url);
const context = vm.createContext({ module: { exports: {} }, exports: {}, require });
script.runInContext(context);
const { decodeMcpLiteral } = context.module.exports;

const cases = [
  {
    description: 'named entity &amp;',
    input: 'cd /tmp &amp;&amp; ls',
    expected: 'cd /tmp && ls',
  },
  {
    description: 'named entity &lt;',
    input: '1 &lt; 2',
    expected: '1 < 2',
  },
  {
    description: 'named entity &gt;',
    input: '2 &gt; 1',
    expected: '2 > 1',
  },
  {
    description: 'named entity &quot;',
    input: '&quot;quoted&quot;',
    expected: '"quoted"',
  },
  {
    description: 'named entity &apos;',
    input: "&apos;single&apos;",
    expected: "'single'",
  },
  {
    description: 'decimal numeric entity',
    input: 'Value: &#38;',
    expected: 'Value: &',
  },
  {
    description: 'hex numeric entity',
    input: 'Smiley: &#x1F600;',
    expected: 'Smiley: 😀',
  },
  {
    description: 'nested entity requires iterative decoding',
    input: '&amp;amp;',
    expected: '&',
  },
  {
    description: 'unknown entity is preserved',
    input: '&madeup;',
    expected: '&madeup;',
  },
  {
    description: 'string without entities is untouched',
    input: 'plain text',
    expected: 'plain text',
  },
];

cases.forEach(({ description, input, expected }) => {
  const actual = decodeMcpLiteral(input);
  assert.strictEqual(
    actual,
    expected,
    `Expected ${description} to decode to "${expected}" but received "${actual}"`,
  );
});

console.log('All html entity decoder tests passed.');
