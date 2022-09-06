import {TokenType} from '..';
import {Token} from '../tokenize';
import {
  MathOperationReader,
  FunctionCallReader,
  FunctionExpressionReader,
  DictionaryExpressionReader,
  resolveTestEvent,
  resolveAssignmentEvent,
  Operator,
  Event,
  EventType,
  TokenExpression,
  MemberExpressionReader,
  AssignmentExpression,
} from './resolvers';

export default function parse(tokens: Token[]): Event[] {
  const events: Event[] = [];
  let currentDepth = 0;

  const lines = tokens.reduce(
    (currentLines, token) => {
      if (token.value === Operator.BlockOpen) currentDepth += 1;
      if (token.value === Operator.BlockClose) currentDepth -= 1;

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

  let leftHandEvent: AssignmentExpression['left'] | null = null;
  let currentReader:
    | MathOperationReader
    | FunctionCallReader
    | FunctionExpressionReader
    | DictionaryExpressionReader
    | MemberExpressionReader
    | null = null;

  for (const [index, {type, value}] of tokens.entries()) {
    const isEndOfInput = index === tokens.length - 1;
    const prevToken = index === 0 ? null : tokens[index - 1];

    if (leftHandEvent !== null) {
      const testEvent = resolveTestEvent(
        {type, value},
        leftHandEvent,
        index,
        tokens,
      );

      if (testEvent) return testEvent;

      const assignmentEvent = resolveAssignmentEvent(
        {type, value},
        leftHandEvent,
        index,
        tokens,
      );

      if (assignmentEvent) return assignmentEvent;

      return leftHandEvent;
    }

    if (currentReader !== null && prevToken) {
      const event = currentReader.read(
        {type, value},
        prevToken,
        index,
        isEndOfInput,
      );

      if (event) {
        if (currentReader.canBeLeftHandEvent && !isEndOfInput) {
          leftHandEvent = event as AssignmentExpression['left'];
          continue;
        }
        return event;
      } else {
        continue;
      }
    }

    if (prevToken == null) {
      continue;
    }

    if (
      MemberExpressionReader.isMemberExpressionStart({type, value}, prevToken)
    ) {
      currentReader = new MemberExpressionReader(
        prevToken as Token<TokenType.Symbol>,
        tokens,
      );
      continue;
    }

    if (
      DictionaryExpressionReader.isDictionaryExpressionStart(
        {type, value},
        prevToken,
      )
    ) {
      currentReader = new DictionaryExpressionReader({type, value});
      continue;
    }

    if (
      FunctionExpressionReader.isFunctionExpressionStart(
        {type, value},
        prevToken,
      )
    ) {
      currentReader = new FunctionExpressionReader(tokens);
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

    const testEvent = resolveTestEvent(
      {type, value},
      {
        type: EventType.TokenExpression,
        token: prevToken,
      } as TokenExpression<TokenType.Symbol>,
      index,
      tokens,
    );
    if (testEvent) return testEvent;

    const assignmentEvent = resolveAssignmentEvent(
      {type, value},
      {
        type: EventType.TokenExpression,
        token: prevToken,
      } as TokenExpression<TokenType.Symbol>,
      index,
      tokens,
    );
    if (assignmentEvent) return assignmentEvent;
  }

  return null;
}
