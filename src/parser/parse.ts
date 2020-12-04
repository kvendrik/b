import {Token, Type as TokenType} from './tokenize';

export enum EventType {
  Operation = 'Operation',
  Assignment = 'Assignment',
  TokenExpression = 'TokenExpression',
  FunctionExpression = 'FunctionExpression',
  FunctionCall = 'FunctionCall',
}

export enum Operator {
  Add = '+',
  Multiply = '*',
  Subtract = '-',
  Divide = '/',
  Equals = '=',
  EndOfLine = ';',
  PriorityGroupOpen = '(',
  PriorityGroupClose = ')',
  FunctionExpressionOpen = '{',
  FunctionExpressionClose = '}',
  ListDivider = ',',
}

export interface GenericExpression {
  type: EventType.Assignment | EventType.Operation;
  operator: Operator;
  left: Token | Event;
  right: Token | Event | null;
}

export interface TokenExpression {
  type: EventType.TokenExpression;
  token: Token;
}

export interface FunctionExpression {
  type: EventType.FunctionExpression;
  parameters: Token[] | null;
  body: Event[] | null;
}

export interface FunctionCall {
  type: EventType.FunctionCall;
  symbol: string;
  parameters: Token[] | null;
}

export type Event =
  | GenericExpression
  | TokenExpression
  | FunctionExpression
  | FunctionCall;

export default function parse(tokens: Token[]): Event[] {
  const events: Event[] = [];

  const lines = tokens.reduce(
    (currentLines, token) => {
      if (token.value === Operator.EndOfLine) {
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

function parseGroup(tokens: Token[]): Event | null {
  let event: Event | null = null;

  if (tokens.length === 1 && tokens[0].type === TokenType.Symbol) {
    return {
      type: EventType.TokenExpression,
      token: tokens[0],
    } as TokenExpression;
  }

  for (const [index, {type, value}] of tokens.entries()) {
    const isEndOfInput = index === tokens.length - 1;

    const operationOpen = event?.type === EventType.Operation;
    const assignmentOpen = event?.type === EventType.Assignment;
    const functionOpen = event?.type === EventType.FunctionExpression;
    const functionCallOpen = event?.type === EventType.FunctionCall;

    const prevToken = index === 0 ? null : tokens[index - 1];

    if (value === Operator.FunctionExpressionOpen) {
      event = {
        type: EventType.FunctionExpression,
        parameters: null,
        body: null,
      };
      continue;
    }

    if (functionOpen) {
      const expressionEvent = (event as FunctionExpression)!;

      if (value === Operator.PriorityGroupOpen) {
        expressionEvent.parameters = [];
      }

      if (type === TokenType.Symbol && expressionEvent.parameters) {
        expressionEvent.parameters?.push({type, value});
      }

      if (value === Operator.PriorityGroupClose) {
        const bodyEvents = parse(tokens.slice(index + 1, tokens.length - 1));
        expressionEvent.body = bodyEvents;
        return expressionEvent;
      }

      continue;
    }

    if (
      value === Operator.PriorityGroupOpen &&
      prevToken?.type === TokenType.Symbol
    ) {
      event = {
        type: EventType.FunctionCall,
        symbol: prevToken!.value,
        parameters: [],
      };
      continue;
    }

    if (functionCallOpen) {
      const callEvent = (event as FunctionCall)!;

      if (value === Operator.ListDivider) continue;

      if (value === Operator.PriorityGroupClose) {
        return event;
      }

      callEvent.parameters?.push({type, value});
      continue;
    }

    const genericExpressionEvent = (event as GenericExpression)!;

    if (assignmentOpen && event) {
      const nextTokens = tokens.slice(index);

      if (nextTokens.length === 1) {
        genericExpressionEvent.right = nextTokens[0];
        return genericExpressionEvent;
      }

      genericExpressionEvent.right = parseGroup(tokens.slice(index));
      return genericExpressionEvent;
    }

    if (type === TokenType.Operation && prevToken) {
      if (operationOpen && event) {
        genericExpressionEvent.right = parseGroup([
          prevToken,
          {type, value},
          ...tokens.slice(index + 1),
        ]);
        return genericExpressionEvent;
      }

      event = {
        type: EventType.Operation,
        operator: getMathOperatorType(value) || ('' as Operator),
        left: prevToken,
        right: null,
      };
      continue;
    }

    if (isEndOfInput && operationOpen && event) {
      genericExpressionEvent.right = {type, value};
    }

    if (value === Operator.Equals && prevToken) {
      const valueTokens = tokens.slice(index + 1);
      return {
        type: EventType.Assignment,
        operator: Operator.Equals,
        left: prevToken,
        right:
          valueTokens.length === 1 ? valueTokens[0] : parseGroup(valueTokens),
      };
    }
  }

  return event;
}

function getMathOperatorType(value: string) {
  switch (value) {
    case '+':
      return Operator.Add;
    case '*':
      return Operator.Multiply;
    case '-':
      return Operator.Subtract;
    case '/':
      return Operator.Divide;
  }
  return null;
}
