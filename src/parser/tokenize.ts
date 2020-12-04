export enum Type {
  Operation = 'operation',
  Symbol = 'symbol',
  String = 'string',
  Number = 'number',
  Special = 'special',
}

export interface Token {
  type: Type;
  value: string;
}

export default function tokenize(input: string): Token[] {
  const tokens = [];

  const numberState = {
    open: false,
    currentValue: '',
  };

  const stringState = {
    open: false,
    openingQuote: '',
    currentValue: '',
  };

  const symbolState = {
    open: false,
    currentValue: '',
  };

  for (const [index, character] of [...input].entries()) {
    const isLastCharacter = index === input.length - 1;

    if (character === ' ' && !stringState.open && !symbolState.open) {
      continue;
    }

    if (/[0-9]/.test(character)) {
      if (!numberState.open) {
        numberState.open = true;
        numberState.currentValue = '';
      }

      numberState.currentValue += character;

      if (numberState.open && isLastCharacter) {
        tokens.push({
          type: Type.Number,
          value: numberState.currentValue,
        });
        numberState.open = false;
      }

      continue;
    }

    if (numberState.open) {
      tokens.push({
        type: Type.Number,
        value: numberState.currentValue,
      });
      numberState.open = false;
    }

    if (
      ['=', '(', ')', '?', ':', '{', '}', ',', ';'].includes(character) &&
      !stringState.open
    ) {
      closeSymbolRead();
      tokens.push({
        type: Type.Special,
        value: character,
      });
      continue;
    }

    if (['+', '-', '*', '/'].includes(character)) {
      tokens.push({
        type: Type.Operation,
        value: character,
      });
      continue;
    }

    if (['"', "'"].includes(character)) {
      if (!stringState.open) {
        stringState.open = true;
        stringState.openingQuote = character;
        stringState.currentValue = '';
        continue;
      }

      if (stringState.open && character === stringState.openingQuote) {
        tokens.push({
          type: Type.String,
          value: stringState.currentValue,
        });

        stringState.open = false;
        continue;
      }
    }

    if (stringState.open) {
      stringState.currentValue += character;
    } else if (!symbolState.open && /[A-Za-z_]/.test(character)) {
      symbolState.open = true;
      symbolState.currentValue = character;
    } else if (symbolState.open) {
      if (/[A-Za-z_]/.test(character)) {
        symbolState.currentValue += character;

        if (isLastCharacter) {
          closeSymbolRead();
        }
      } else {
        closeSymbolRead();
      }
    }
  }

  if (stringState.open) {
    throw new Error('Unclosed string');
  }

  return tokens;

  function closeSymbolRead() {
    if (symbolState.open) {
      symbolState.open = false;
      tokens.push({
        type: Type.Symbol,
        value: symbolState.currentValue,
      });
    }
  }
}
