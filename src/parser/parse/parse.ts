import {Token} from '../tokenize';
import {
  MathOperationReader,
  FunctionCallReader,
  FunctionExpressionReader,
  resolveTestEvent,
  resolveAssignmentEvent,
  Operator,
  Event,
  EventType,
  TokenExpression,
} from './resolvers';

export default function parse(tokens: Token[]): Event[] {
  const events: Event[] = [];
  let currentDepth = 0;

  const lines = tokens.reduce(
    (currentLines, token) => {
      if (token.value === Operator.FunctionExpressionOpen) currentDepth += 1;
      if (token.value === Operator.FunctionExpressionClose) currentDepth -= 1;

      if (token.value === Operator.EndOfLine && currentDepth === 0) {
        return [...currentLines, []];
      }

      currentLines[currentLines.length - 1].push(token);
      return currentLines;
    },
    [[]] as Token[][],
  );

  for (const line of lines) {
    const eventsForLine = parseGroup(line);
    if (eventsForLine) events.push(eventsForLine);
  }

  return events;
}

export function parseGroup(tokens: Token[]): Event | null {
  if (tokens.length === 1) {
    return {
      type: EventType.TokenExpression,
      token: tokens[0],
    } as TokenExpression;
  }

  let currentReader:
    | MathOperationReader
    | FunctionCallReader
    | FunctionExpressionReader
    | null = null;

  for (const [index, {type, value}] of tokens.entries()) {
    const isEndOfInput = index === tokens.length - 1;
    const prevToken = index === 0 ? null : tokens[index - 1];

    if (currentReader !== null && prevToken) {
      const event = currentReader.read(
        {type, value},
        prevToken,
        index,
        isEndOfInput,
      );
      if (event) {
        return event;
      } else {
        continue;
      }
    }

    if (FunctionExpressionReader.isFunctionExpressionStart({type, value})) {
      currentReader = new FunctionExpressionReader(tokens);
      continue;
    }

    if (prevToken == null) {
      continue;
    }

    if (FunctionCallReader.isFunctionCallStart({type, value}, prevToken)) {
      currentReader = new FunctionCallReader(prevToken);
      continue;
    }

    if (MathOperationReader.isMathOperationStart({type, value})) {
      currentReader = new MathOperationReader({type, value}, prevToken, tokens);
      continue;
    }

    const testEvent = resolveTestEvent({type, value}, prevToken, index, tokens);
    if (testEvent) return testEvent;

    const assignmentEvent = resolveAssignmentEvent(
      {type, value},
      prevToken,
      index,
      tokens,
    );
    if (assignmentEvent) return assignmentEvent;
  }

  return null;
}
