import {Token, Type as TokenType} from './tokenize';

export enum EventType {
  Operation = 'operation',
  Assignment = 'assignment',
  FunctionExpression = 'FunctionExpression',
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
}

export interface GenericExpression {
  type: EventType;
  operator: Operator;
  left: Token | Event;
  right?: Token | Event;
}

export interface FunctionExpression {
  type: EventType;
  parameters?: Token[];
  body?: Event[];
}

export type Event = GenericExpression | FunctionExpression;

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

function parseGroup(tokens: Token[]) {
  let event: Event | undefined = undefined;

  for (const [index, {type, value}] of tokens.entries()) {
    const isEndOfInput = index === tokens.length - 1;

    const operationOpen = event?.type === EventType.Operation;
    const assignmentOpen = event?.type === EventType.Assignment;
    const functionOpen = event?.type === EventType.FunctionExpression;

    const prevToken = index === 0 ? null : tokens[index - 1];

    if (value === Operator.FunctionExpressionOpen) {
      event = {
        type: EventType.FunctionExpression,
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
      };
      continue;
    }

    if (isEndOfInput && operationOpen && event) {
      genericExpressionEvent.right = {type, value};
    }

    if (value === Operator.Equals && prevToken) {
      event = {
        type: EventType.Assignment,
        operator: Operator.Equals,
        left: prevToken,
      };
      continue;
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
