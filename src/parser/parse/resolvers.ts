import {Token, Type as TokenType} from '../tokenize';
import parse, {parseGroup} from './parse';

export enum EventType {
  MathOperation = 'MathOperation',
  Assignment = 'Assignment',
  TokenExpression = 'TokenExpression',
  FunctionExpression = 'FunctionExpression',
  FunctionCall = 'FunctionCall',
  Test = 'Test',
  DictionaryExpression = 'DictionaryExpression',
  MemberExpression = 'MemberExpression',
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
  MemberOpen = '[',
  MemberClose = ']',
  BlockOpen = '{',
  BlockClose = '}',
  DictionaryPairDivider = ':',
  ListDivider = ',',
}

export interface GenericExpression {
  type: EventType.MathOperation | EventType.Test;
  operator: Operator;
  left: Event;
  right: Event | null;
}

export interface AssignmentExpression {
  type: EventType.Assignment;
  operator: Operator;
  left: TokenExpression<TokenType.Symbol> | MemberExpression;
  right: Event | null;
}

export interface TokenExpression<T = TokenType> {
  type: EventType.TokenExpression;
  token: Token<T>;
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

export interface DictionaryExpression {
  type: EventType.DictionaryExpression;
  body: {key: Token<TokenType.String>; value: Event}[];
}

export interface MemberExpression {
  type: EventType.MemberExpression;
  symbol: Token<TokenType.Symbol>;
  keys: Event[];
}

export type Event =
  | GenericExpression
  | AssignmentExpression
  | TokenExpression
  | FunctionExpression
  | FunctionCall
  | DictionaryExpression
  | MemberExpression;

interface ExpressionReader {
  canBeLeftHandEvent: boolean;
  read(
    token: Token,
    prevToken: Token,
    index: number,
    isEndOfInput: boolean,
  ): Event | void;
}

export class MemberExpressionReader implements ExpressionReader {
  public canBeLeftHandEvent = true;
  private event: MemberExpression;
  private currentKeyTokens: Token[] = [];
  private inExpression = true;

  static isMemberExpressionStart({value}: Token, prevToken: Token) {
    return value === Operator.MemberOpen && prevToken.type === TokenType.Symbol;
  }

  constructor(symbolToken: Token<TokenType.Symbol>, private tokens: Token[]) {
    this.event = {
      type: EventType.MemberExpression,
      symbol: symbolToken,
      keys: [],
    };
  }

  read({type, value}: Token, _: Token, index: number) {
    if (value === Operator.MemberOpen) {
      this.inExpression = true;
      return;
    }

    if (value === Operator.MemberClose) {
      this.inExpression = false;

      const nextTokenValue = this.tokens[index + 1]?.value;

      if (nextTokenValue !== Operator.MemberOpen) {
        this.evaluateCurrentKey();
        return this.event;
      }

      this.evaluateCurrentKey();
      return;
    }

    if (this.inExpression) {
      this.currentKeyTokens.push({type, value});
    }
  }

  private evaluateCurrentKey() {
    const keyEvent =
      this.currentKeyTokens.length === 1
        ? ({
            type: EventType.TokenExpression,
            token: this.currentKeyTokens[0],
          } as TokenExpression)
        : parseGroup(this.currentKeyTokens);

    if (keyEvent == null)
      throw new Error(`Evaluation of dictionary key resulted in void.`);

    this.event.keys.push(keyEvent);
    this.currentKeyTokens = [];
  }
}

export class DictionaryExpressionReader implements ExpressionReader {
  public canBeLeftHandEvent = false;
  private event: DictionaryExpression;
  private currentValueTokens: Token[] = [];
  private parsingType: 'key' | 'value' = 'key';
  private depth = 0;

  static isDictionaryExpressionStart({type}: Token, prevToken: Token) {
    return type === TokenType.String && prevToken.value === Operator.BlockOpen;
  }

  constructor(private currentKey: Token | null) {
    this.event = {
      type: EventType.DictionaryExpression,
      body: [],
    };
  }

  read({type, value}: Token) {
    if (value === Operator.BlockOpen) this.depth += 1;

    if (value === Operator.BlockClose) {
      if (this.depth === 0) {
        this.parseCurrentKeyValuePair();
        return this.event;
      }
      this.depth -= 1;
    }

    if (
      this.parsingType === 'value' &&
      !(this.depth === 0 && value === Operator.ListDivider)
    ) {
      this.currentValueTokens.push({type, value});
    }

    if (this.depth !== 0) {
      return;
    }

    if (type === TokenType.String && this.parsingType === 'key') {
      this.currentKey = {type, value};
      return;
    }

    if (value === Operator.DictionaryPairDivider) {
      this.parsingType = 'value';
      return;
    }

    if (value === Operator.ListDivider) {
      this.parsingType = 'key';
      this.parseCurrentKeyValuePair();
      return;
    }
  }

  private parseCurrentKeyValuePair() {
    if (this.currentKey == null)
      throw new Error(`No key found for dictionary literal pair.`);

    const value = parseGroup(this.currentValueTokens);

    if (value == null)
      throw new Error(`Value on ${this.currentKey} evaluated to void.`);

    this.event.body.push({
      key: this.currentKey as Token<TokenType.String>,
      value,
    });

    this.currentKey = null;
    this.currentValueTokens = [];
  }
}

export class FunctionExpressionReader implements ExpressionReader {
  public canBeLeftHandEvent = false;
  private event: FunctionExpression;

  static isFunctionExpressionStart({value}: Token, prevToken: Token) {
    return (
      value === Operator.PriorityGroupOpen &&
      prevToken.value === Operator.BlockOpen
    );
  }

  constructor(private tokens: Token[]) {
    this.event = {
      type: EventType.FunctionExpression,
      parameters: [],
      body: null,
    };
  }

  read({type, value}: Token, _: Token, index: number) {
    if (type === TokenType.Symbol) {
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
  public canBeLeftHandEvent = false;
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
  public canBeLeftHandEvent = false;
  private event: GenericExpression;

  static isMathOperationStart({type}: Token) {
    return type === TokenType.MathOperation;
  }

  constructor({value}: Token, prevToken: Token, private tokens: Token[]) {
    this.event = {
      type: EventType.MathOperation,
      operator: getMathOperatorType(value) || ('' as Operator),
      left: {
        type: EventType.TokenExpression,
        token: prevToken,
      } as TokenExpression,
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
      this.event.right = {
        type: EventType.TokenExpression,
        token: {type, value},
      } as TokenExpression;
      return this.event;
    }
  }
}

export function resolveAssignmentEvent(
  {value}: Token,
  left: AssignmentExpression['left'],
  index: number,
  tokens: Token[],
): Event | void {
  if (value !== Operator.AssignmentSplit) return;

  const valueTokens = tokens.slice(index + 1);

  return {
    type: EventType.Assignment,
    operator: Operator.AssignmentSplit,
    left,
    right:
      valueTokens.length === 1
        ? {
            type: EventType.TokenExpression,
            token: valueTokens[0],
          }
        : parseGroup(valueTokens),
  };
}

export function resolveTestEvent(
  {value}: Token,
  left: AssignmentExpression['left'],
  index: number,
  tokens: Token[],
): Event | void {
  if (value === Operator.Negative) {
    const valueTokens = tokens.slice(index + 2);
    return {
      type: EventType.Test,
      operator: Operator.NegativeEquals,
      left,
      right:
        valueTokens.length === 1
          ? ({
              type: EventType.TokenExpression,
              token: valueTokens[0],
            } as TokenExpression)
          : parseGroup(valueTokens),
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
        left,
        right:
          valueTokens.length === 1
            ? ({
                type: EventType.TokenExpression,
                token: valueTokens[0],
              } as TokenExpression)
            : parseGroup(valueTokens),
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
      left,
      right:
        valueTokens.length === 1
          ? ({
              type: EventType.TokenExpression,
              token: valueTokens[0],
            } as TokenExpression)
          : parseGroup(valueTokens),
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
