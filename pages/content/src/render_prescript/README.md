# MCP Literal Decoding Guide

This document explains how the HTML entity decoding helper is wired into the
renderer pipeline, how to use it when introducing new parsing paths, and the
maintenance checks to perform when upstream renderer code changes.

## What the Decoder Does

`src/utils/htmlEntityDecoder.ts` exports a single `decodeMcpLiteral(value)`
function. It converts the small set of HTML named entities that appear in MCP
payloads (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`) as well as numeric entity
references (decimal and hexadecimal) into their literal characters. The helper
is deliberately lightweight so it can be copied into upstream branches without
pulling in external dependencies.

## Where Decoding Happens

The decoder runs in two hot paths so that both rendered output and live stream
previews see the same parsed values:

1. **`renderer/components.ts`** – After CDATA extraction, every string parameter
   is passed through `decodeMcpLiteral` before we decide whether it should be
   parsed as JSON, a number, or a boolean. This ensures the type inference logic
   always operates on decoded strings.
2. **`renderer/functionBlock.ts`** – `CacheUtils.parseContentEfficiently`
   decodes each streamed parameter value before it is added to
   `parameters[paramName]`, keeping the preview pane aligned with the payload
   that is sent to the MCP server.

If you add new entry points that turn XML parameter nodes into JavaScript
strings, call `decodeMcpLiteral` immediately after extracting the raw text so
any later consumers see the decoded value.

```ts
import { decodeMcpLiteral } from '../utils';

const raw = parameterNode.textContent ?? '';
const decoded = decodeMcpLiteral(raw);
```

## Keeping the Helper in Sync with Upstream

When pulling changes from the upstream renderer:

- **Check merge points** – Upstream updates occasionally refactor parameter
  parsing. Make sure our decoder call still sits directly after the CDATA/raw
  text extraction in both `components.ts` and `functionBlock.ts`.
- **Respect new parsing flows** – If upstream adds another code path that reads
  parameter text (e.g., a new streaming helper or memoized parser), ensure the
  decoder is invoked there as well.
- **Expand entities if required** – If new named entities appear in MCP payloads,
  extend the `NAMED_ENTITIES` map. For anything outside the core set, verify the
  upstream service expects the decoded character before shipping.
- **Watch numeric decoding** – The helper already covers decimal (`&#123;`) and
  hexadecimal (`&#x7B;`) references. If upstream introduces error handling or
  range checks, mirror that logic here so the behaviour remains consistent.

## Testing Checklist

- Smoke test with a parameter such as
  `<parameter name="command">cd /tmp &amp;&amp; ls &gt; out</parameter>` and verify the
  decoded literal shows up in both the MCP request payload and the rendered UI.
- Run `node pages/content/src/render_prescript/tests/html-entity-decoder.test.mjs`
  to exercise the named entities (`amp`, `lt`, `gt`, `quot`, `apos`), decimal and
  hexadecimal numeric references, nested encodings, and the fall-through branch
  for unknown entities.
- If additional entities are added, extend the manual and automated test data to
  cover them.

By keeping these hooks and checks in place, the decoder will continue to shield
users from raw HTML entity noise even as the renderer evolves.
