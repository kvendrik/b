import {Token, Type as TokenType} from '../tokenize';
import parse, {parseGroup} from './parse';

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
  Remainder = '%',
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
  parameters: Event[];
}

export type Event =
  | GenericExpression
  | TokenExpression
  | FunctionExpression
  | FunctionCall;

interface ExpressionReader {
  read(
    token: Token,
    prevToken: Token,
    index: number,
    isEndOfInput: boolean,
  ): Event | void;
}

export class FunctionExpressionReader implements ExpressionReader {
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

export class FunctionCallReader implements ExpressionReader {
  private depth = 0;
  private parameterTokens: Token[][] = [[]];
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

  read(
    {type, value}: Token,
    _prevToken: Token,
    _index: number,
    isEndOfInput: boolean,
  ) {
    if (value === Operator.PriorityGroupOpen) this.depth += 1;
    if (value === Operator.PriorityGroupClose) this.depth -= 1;

    if (value === Operator.ListDivider && this.depth === 0) {
      this.parameterTokens.push([]);
      return;
    }

    if (isEndOfInput) {
      this.event.parameters = this.parseParameterTokens();
      return this.event;
    }

    this.parameterTokens[this.parameterTokens.length - 1].push({type, value});
  }

  private parseParameterTokens() {
    return this.parameterTokens
      .map((tokens) => parseGroup(tokens))
      .filter((parameter) => parameter != null) as Event[];
  }
}

export class MathOperationReader implements ExpressionReader {
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

export function resolveAssignmentEvent(
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

export function resolveTestEvent(
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
    case Operator.Remainder:
      return Operator.Remainder;
  }
  return null;
}
