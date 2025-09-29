const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

const ENTITY_REGEX = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g;

const decodeNumericEntity = (entity: string): string | null => {
  const isHex = entity[1]?.toLowerCase() === 'x';
  const numberPart = isHex ? entity.slice(2) : entity.slice(1);

  if (numberPart.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(numberPart, isHex ? 16 : 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  try {
    return String.fromCodePoint(parsed);
  } catch {
    return null;
  }
};

export function decodeMcpLiteral(value: string): string {
  if (!value || !value.includes('&')) {
    return value;
  }

  let previous = value;
  let decoded = value;

  do {
    previous = decoded;
    decoded = previous.replace(ENTITY_REGEX, (match, entity) => {
      if (entity.startsWith('#')) {
        const result = decodeNumericEntity(entity);
        return result ?? match;
      }

      const lower = entity.toLowerCase();
      if (lower in NAMED_ENTITIES) {
        return NAMED_ENTITIES[lower];
      }

      return match;
    });
  } while (decoded !== previous && decoded.includes('&'));

  return decoded;
}
