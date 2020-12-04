import {Token, Type as TokenType} from './tokenize';

export enum EventType {
  MathOperation = 'MathOperation',
  Assignment = 'Assignment',
  TokenExpression = 'TokenExpression',
  FunctionExpression = 'FunctionExpression',
  FunctionCall = 'FunctionCall',
  Test = 'Test',
}

export enum Operator {
  Add = '+',
  Multiply = '*',
  Subtract = '-',
  Divide = '/',
  AssignmentSplit = '=',
  BiggerThan = '>',
  SmallerThan = '<',
  Equals = '==',
  Negative = '!',
  NegativeEquals = '!=',
  EndOfLine = ';',
  PriorityGroupOpen = '(',
  PriorityGroupClose = ')',
  FunctionExpressionOpen = '{',
  FunctionExpressionClose = '}',
  ListDivider = ',',
}

export interface GenericExpression {
  type: EventType.Assignment | EventType.MathOperation | EventType.Test;
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
  let currentlyInNestedBlock = false;

  const lines = tokens.reduce(
    (currentLines, token) => {
      if (token.value === Operator.FunctionExpressionOpen)
        currentlyInNestedBlock = true;
      if (token.value === Operator.FunctionExpressionClose)
        currentlyInNestedBlock = false;

      if (token.value === Operator.EndOfLine && !currentlyInNestedBlock) {
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

  if (tokens.length === 1) {
    return {
      type: EventType.TokenExpression,
      token: tokens[0],
    } as TokenExpression;
  }

  for (const [index, {type, value}] of tokens.entries()) {
    const isEndOfInput = index === tokens.length - 1;

    const operationOpen = event?.type === EventType.MathOperation;
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

    if (type === TokenType.MathOperation && prevToken) {
      if (operationOpen && event) {
        genericExpressionEvent.right = parseGroup([
          prevToken,
          {type, value},
          ...tokens.slice(index + 1),
        ]);
        return genericExpressionEvent;
      }

      event = {
        type: EventType.MathOperation,
        operator: getMathOperatorType(value) || ('' as Operator),
        left: prevToken,
        right: null,
      };
      continue;
    }

    if (isEndOfInput && operationOpen && event) {
      genericExpressionEvent.right = {type, value};
      return genericExpressionEvent;
    }

    const testEvent =
      prevToken && resolveTestEvent({type, value}, prevToken, index, tokens);
    if (testEvent) return testEvent;

    const assignmentEvent =
      prevToken &&
      resolveAssignmentEvent({type, value}, prevToken, index, tokens);
    if (assignmentEvent) return assignmentEvent;
  }

  return event;
}

function resolveAssignmentEvent(
  {value}: Token,
  prevToken: Token,
  index: number,
  tokens: Token[],
): Event | void {
  if (value === Operator.AssignmentSplit && prevToken) {
    let valueTokens = tokens.slice(index + 1);

    return {
      type: EventType.Assignment,
      operator: Operator.AssignmentSplit,
      left: prevToken,
      right:
        valueTokens.length === 1 ? valueTokens[0] : parseGroup(valueTokens),
    };
  }
}

function resolveTestEvent(
  {value}: Token,
  prevToken: Token,
  index: number,
  tokens: Token[],
): Event | void {
  if (value === Operator.Negative) {
    const valueTokens = tokens.slice(index + 2);
    return {
      type: EventType.Test,
      operator: Operator.NegativeEquals,
      left: prevToken,
      right:
        valueTokens.length === 1 ? valueTokens[0] : parseGroup(valueTokens),
    };
  }

  if (value === Operator.AssignmentSplit) {
    let valueTokens = tokens.slice(index + 1);
    if (
      valueTokens[0].type === TokenType.Special &&
      `${value}${valueTokens[0].value}` === Operator.Equals
    ) {
      valueTokens = tokens.slice(index + 2);
      return {
        type: EventType.Test,
        operator: Operator.Equals,
        left: prevToken,
        right:
          valueTokens.length === 1 ? valueTokens[0] : parseGroup(valueTokens),
      };
    }
  }

  if (value === Operator.BiggerThan || value === Operator.SmallerThan) {
    const valueTokens = tokens.slice(index + 1);

    return {
      type: EventType.Test,
      operator:
        value === Operator.BiggerThan
          ? Operator.BiggerThan
          : Operator.SmallerThan,
      left: prevToken,
      right:
        valueTokens.length === 1 ? valueTokens[0] : parseGroup(valueTokens),
    };
  }
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
