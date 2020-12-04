import {Token, Type as TokenType} from '../tokenize';

export enum EventType {
  MathOperation = 'MathOperation',
  Assignment = 'Assignment',
  TokenExpression = 'TokenExpression',
  FunctionExpression = 'FunctionExpression',
  FunctionCall = 'FunctionCall',
  Test = 'Test',
  Condition = 'Condition',
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
  ConditionTestEnd = '?',
  ConditionTestSplit = ':',
}

export interface GenericExpression {
  type: EventType.Assignment | EventType.MathOperation | EventType.Test;
  operator: Operator;
  left: Token | Event;
  right: Token | Event | null;
}

export interface ConditionalExpression {
  type: EventType.Condition;
  test: GenericExpression & {type: EventType.Test};
  consequent: Token | Event;
  alternate: Token | Event | null;
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
  | FunctionCall
  | ConditionalExpression;

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

class FunctionExpressionReader {
  private event: FunctionExpression;

  static isFunctionExpressionStart({value}: Token) {
    return value === Operator.FunctionExpressionOpen;
  }

  constructor(private tokens: Token[]) {
    this.event = {
      type: EventType.FunctionExpression,
      parameters: null,
      body: null,
    };
  }

  read({type, value}: Token, _: Token, index: number) {
    if (value === Operator.PriorityGroupOpen) {
      this.event.parameters = [];
    }

    if (type === TokenType.Symbol && this.event.parameters) {
      this.event.parameters?.push({type, value});
    }

    if (value === Operator.PriorityGroupClose) {
      const bodyEvents = parse(
        this.tokens.slice(index + 1, this.tokens.length - 1),
      );
      this.event.body = bodyEvents;
      return this.event;
    }
  }
}

class FunctionCallReader {
  private event: FunctionCall;

  static isFunctionCallStart({value}: Token, prevToken: Token) {
    return (
      value === Operator.PriorityGroupOpen &&
      prevToken.type === TokenType.Symbol
    );
  }

  constructor(prevToken: Token) {
    this.event = {
      type: EventType.FunctionCall,
      symbol: prevToken!.value,
      parameters: [],
    };
  }

  read({type, value}: Token) {
    if (value === Operator.ListDivider) return;

    if (value === Operator.PriorityGroupClose) {
      return this.event;
    }

    this.event.parameters?.push({type, value});
  }
}

class MathOperationReader {
  private event: GenericExpression;

  static isMathOperationStart({type}: Token) {
    return type === TokenType.MathOperation;
  }

  constructor({value}: Token, prevToken: Token, private tokens: Token[]) {
    this.event = {
      type: EventType.MathOperation,
      operator: getMathOperatorType(value) || ('' as Operator),
      left: prevToken,
      right: null,
    };
  }

  read(
    {type, value}: Token,
    prevToken: Token,
    index: number,
    isEndOfInput: boolean,
  ) {
    if (this.event == null) return;

    if (type === TokenType.MathOperation) {
      this.event.right = parseGroup([
        prevToken,
        {type, value},
        ...this.tokens.slice(index + 1),
      ]);
      return this.event;
    }

    if (isEndOfInput) {
      this.event.right = {type, value};
      return this.event;
    }
  }
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
    case Operator.Add:
      return Operator.Add;
    case Operator.Multiply:
      return Operator.Multiply;
    case Operator.Subtract:
      return Operator.Subtract;
    case Operator.Divide:
      return Operator.Divide;
  }
  return null;
}
