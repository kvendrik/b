import {
  Event,
  EventType,
  Token,
  TokenType,
  GenericExpression,
  TokenExpression,
  FunctionExpression,
  FunctionCall,
  Operator,
  BooleanValue,
  AssignmentExpression,
  DictionaryExpression,
  MemberExpression,
} from '../parser';
import builtIns from './builtIns';

export enum ObfuscatedValue {
  Function = '[Function]',
  Dictionary = '[Dictionary]',
}

type StoredExpression =
  | TokenExpression
  | DictionaryExpression
  | FunctionExpression;

export type Context = Map<string, StoredExpression>;
export type NonResolvableExpression =
  | TokenExpression
  | DictionaryExpression
  | FunctionExpression;

enum Keyword {
  Break = 'break',
}

export default class Interpreter {
  constructor(private context: Context = new Map<string, StoredExpression>()) {}

  static toSingleToken(event: NonResolvableExpression): Token {
    switch (event.type) {
      case EventType.FunctionExpression:
        return {type: TokenType.String, value: ObfuscatedValue.Function};
      case EventType.DictionaryExpression:
        return {type: TokenType.String, value: ObfuscatedValue.Dictionary};
      default:
        return event.token;
    }
  }

  evaluate(events: Event[]): NonResolvableExpression | void {
    for (const [index, event] of events.entries()) {
      const isLastEvent = index === events.length - 1;
      switch (event.type) {
        case EventType.Assignment:
          this.handleAssignment(event);
          break;
        case EventType.FunctionExpression:
        case EventType.DictionaryExpression:
          return event;
        case EventType.MemberExpression:
          const expression = this.handleMemberExpressionAction('get', event);
          if (expression == null)
            throw new Error(
              `One or multiple keys on '${event.symbol.value}' are not defined`,
            );
          return expression;
        case EventType.Test:
          return this.handleTest(event);
        case EventType.MathOperation:
          return this.handleMathOperation(event);
        case EventType.TokenExpression:
          if (event.token.value === Keyword.Break) return;
          return this.resolveStoredValue(event.token);
        case EventType.FunctionCall:
          const result = this.handleFunctionCall(event);
          if (isLastEvent) return result;
      }
    }
  }

  private handleMemberExpressionAction(
    type: 'get' | 'set',
    memberExpression: MemberExpression,
    newValueEvent?: Event,
  ): TokenExpression | DictionaryExpression | void {
    if (type === 'set' && !newValueEvent)
      throw new Error('New value is requied when setting a dictionary value.');

    const dictionaryExpression = this.resolveStoredValue(
      memberExpression.symbol,
    );

    const subInterpreter = new Interpreter(this.context);
    let currentDictionaryExpression = dictionaryExpression;

    for (const [index, key] of memberExpression.keys.entries()) {
      const isLastKey = index === memberExpression.keys.length - 1;

      if (currentDictionaryExpression.type !== EventType.DictionaryExpression) {
        throw new Error(
          `${memberExpression.symbol.value} is not a dictionary.`,
        );
      }

      const resolvedKey = subInterpreter.evaluate([key]);

      if (resolvedKey == null)
        throw new Error(
          `Key on ${memberExpression.symbol.value} could not be resolved.`,
        );

      if (resolvedKey.type !== EventType.TokenExpression)
        throw new Error(
          `Key on ${memberExpression.symbol.value} is of unsupported type ${resolvedKey.type}.`,
        );

      const dictionaryPairEntry = [
        ...currentDictionaryExpression.body.entries(),
      ].find(([, {key}]) => key.value === resolvedKey.token.value);

      if (dictionaryPairEntry == null)
        throw new Error(
          `Key on ${memberExpression.symbol.value} is undefined.`,
        );

      const [dictionaryPairIndex, dictionaryPair] = dictionaryPairEntry;

      if (dictionaryPair.value.type === EventType.TokenExpression) {
        if (type === 'get') return dictionaryPair.value;
        currentDictionaryExpression.body[
          dictionaryPairIndex
        ].value = newValueEvent!;
        return;
      }

      if (dictionaryPair.value.type === EventType.DictionaryExpression) {
        if (isLastKey) return dictionaryPair.value;
        currentDictionaryExpression = dictionaryPair.value;
        continue;
      }

      throw new Error(
        `Could not resolve dictionary value on '${memberExpression.symbol.value}'. Only token literals and dictionaries are valid values.`,
      );
    }
  }

  private handleTest(event: GenericExpression): TokenExpression | void {
    if (event.right == null) {
      throw new Error('Test missing right side.');
    }

    if (
      event.left.type !== EventType.TokenExpression ||
      event.right.type !== EventType.TokenExpression
    ) {
      throw new Error('Tests can only be used with tokens.');
    }

    const {
      left: {token: leftToken},
      right: {token: rightToken},
    } = event;

    if (
      event.operator === Operator.Equals ||
      event.operator === Operator.NegativeEquals
    ) {
      const leftExpression = this.resolveStoredValue(leftToken);
      const rightExpression = this.resolveStoredValue(rightToken);

      if (
        leftExpression.type !== EventType.TokenExpression ||
        rightExpression.type !== EventType.TokenExpression
      ) {
        throw new Error('Tests can only run equality checks on tokens.');
      }

      const testResult =
        leftExpression.token.type === rightExpression.token.type &&
        leftExpression.token.value === rightExpression.token.value;

      return tokenToExpression({
        type: TokenType.Boolean,
        value:
          event.operator === Operator.Equals
            ? testResult === true
              ? BooleanValue.True
              : BooleanValue.False
            : testResult === false
            ? BooleanValue.True
            : BooleanValue.False,
      });
    }

    const {left, right} = this.validateNumericOperation(leftToken, rightToken);

    switch (event.operator) {
      case Operator.BiggerThan:
        return tokenToExpression({
          type: TokenType.Boolean,
          value:
            Number(left.value) > Number(right.value)
              ? BooleanValue.True
              : BooleanValue.False,
        });
      case Operator.SmallerThan:
        return tokenToExpression({
          type: TokenType.Boolean,
          value:
            Number(left.value) < Number(right.value)
              ? BooleanValue.True
              : BooleanValue.False,
        });
    }
  }

  private validateNumericOperation(
    left: Token,
    right: Token,
  ): {left: Token<TokenType.Number>; right: Token<TokenType.Number>} {
    const leftExpression = this.resolveStoredValue(left);
    const rightExpression = this.resolveStoredValue(right);

    if (
      leftExpression.type !== EventType.TokenExpression ||
      rightExpression.type !== EventType.TokenExpression ||
      leftExpression.token.type !== TokenType.Number ||
      rightExpression.token.type !== TokenType.Number
    ) {
      throw new Error('Can only execute numeric operations on numbers.');
    }

    return {
      left: leftExpression.token as Token<TokenType.Number>,
      right: rightExpression.token as Token<TokenType.Number>,
    };
  }

  private handleMathOperation({
    operator,
    left,
    right,
  }: GenericExpression): TokenExpression | void {
    if (right == null) {
      throw new Error('Operation missing right side.');
    }

    if (
      left.type === EventType.TokenExpression &&
      right.type === EventType.TokenExpression
    ) {
      return this.resolveMathOperation(operator, left.token, right.token);
    }
  }

  private resolveMathOperation(
    operator: Operator,
    leftToken: Token,
    rightToken: Token,
  ): TokenExpression {
    const {left, right} = this.validateNumericOperation(leftToken, rightToken);

    let outcome = null;

    switch (operator) {
      case Operator.Multiply:
        outcome = Number(left.value) * Number(right.value);
        break;
      case Operator.Divide:
        outcome = Number(left.value) / Number(right.value);
        break;
      case Operator.Add:
        outcome = Number(left.value) + Number(right.value);
        break;
      case Operator.Subtract:
        outcome = Number(left.value) + Number(right.value);
        break;
      case Operator.Remainder:
        outcome = Number(left.value) % Number(right.value);
        break;
      default:
        throw new Error(`Unknown operator ${operator}`);
    }

    return tokenToExpression({
      type: TokenType.Number,
      value: outcome.toString(),
    });
  }

  private handleFunctionCall({
    symbol,
    parameters,
  }: FunctionCall): NonResolvableExpression | void {
    const builtIn = builtIns[symbol];

    if (builtIn) {
      return builtIn.call(builtIns, parameters, this.context);
    }

    const functionExpression = this.context.get(symbol);

    if (functionExpression === undefined) {
      throw new Error(`Function ${symbol} is not defined.`);
    }

    if (functionExpression.type !== EventType.FunctionExpression) {
      throw new Error(`${symbol} is not a function.`);
    }

    return this.evaluateFunction(symbol, functionExpression, parameters || []);
  }

  private evaluateFunction(
    symbol: string,
    {parameters, body}: FunctionExpression,
    callParameters: Event[],
  ): NonResolvableExpression | void {
    if (parameters && parameters.length > callParameters.length) {
      throw new Error(`Call to ${symbol} is missing parameters.`);
    }

    if (
      (parameters && callParameters.length > parameters.length) ||
      (!parameters && callParameters)
    ) {
      throw new Error(`Call to ${symbol} has too many parameters.`);
    }

    if (body == null) {
      return;
    }

    const resolvedParameters = callParameters.map((parameterEvent) => {
      const subInterpreter = new Interpreter(this.context);
      return subInterpreter.evaluate([parameterEvent]);
    });

    const initialContext =
      parameters == null
        ? this.context
        : [...parameters.entries()].reduce((current, [index, {value}]) => {
            const parameterExpression = resolvedParameters[index];
            if (!parameterExpression) {
              throw new Error(
                `Call to ${symbol} has parameter that resolved to incompatible value void.`,
              );
            }
            return current.set(value, parameterExpression);
          }, this.context);

    const subInterpreter = new Interpreter(initialContext);
    return subInterpreter.evaluate(body);
  }

  private resolveStoredValue({type, value}: Token): StoredExpression {
    if (type !== TokenType.Symbol) {
      return {type: EventType.TokenExpression, token: {type, value}};
    }

    const storedValue = this.context.get(value);

    if (storedValue === undefined) {
      throw new Error(`${value} is not defined.`);
    }

    return storedValue;
  }

  private handleAssignment({left, right}: AssignmentExpression) {
    if (left.type === EventType.MemberExpression) {
      if (right == null) {
        throw new Error(
          `Symbol ${left.symbol} does not specify a value to be assigned to it.`,
        );
      }

      if (right.type === EventType.MemberExpression) {
        const valueEvent = this.getMemberExpressionValueAsEvent(
          left.symbol.value,
          right,
        );
        this.handleMemberExpressionAction('set', left, valueEvent);
        return;
      }

      this.handleMemberExpressionAction('set', left, right);
      return;
    }

    const {token: leftToken} = left;

    if (leftToken == null)
      throw new Error('Could not resolve left hand of assignment');

    if (leftToken.type !== TokenType.Symbol) {
      throw new Error('Can’t assign values to a non-symbol.');
    }

    if (right == null) {
      throw new Error(
        `Symbol ${leftToken.value} does not specify a value to be assigned to it.`,
      );
    }

    let tokenExpression;

    switch (right.type) {
      case EventType.FunctionExpression:
      case EventType.DictionaryExpression:
      case EventType.TokenExpression:
        this.context.set(leftToken.value, right);
        break;
      case EventType.MemberExpression:
        const valueEvent = this.getMemberExpressionValueAsEvent(
          leftToken.value,
          right,
        );
        this.context.set(leftToken.value, valueEvent);
        break;
      case EventType.MathOperation:
        tokenExpression = this.handleMathOperation(right);
        if (tokenExpression == null)
          throw new Error(
            `Math operation could not be resolved for '${leftToken.value}'.`,
          );
        this.context.set(leftToken.value, tokenExpression);
        break;
      case EventType.FunctionCall:
        tokenExpression = this.handleFunctionCall(right);
        if (tokenExpression == null)
          throw new Error(
            `Call to ${right.symbol} resulted in void which cannot be assigned to '${leftToken.value}'.`,
          );
        this.context.set(leftToken.value, tokenExpression);
        break;
      default:
        throw new Error(`Right side of '${leftToken.value}' is empty.`);
    }
  }

  private getMemberExpressionValueAsEvent(
    leftHandSymbolValue: string,
    expression: MemberExpression,
  ): DictionaryExpression | TokenExpression {
    const result = this.handleMemberExpressionAction('get', expression);
    if (result == null)
      throw new Error(`Right side of '${leftHandSymbolValue}' is empty.`);
    return result;
  }
}

export function tokenToExpression<T>(token: Token<T>) {
  return {
    type: EventType.TokenExpression,
    token,
  } as TokenExpression<T>;
}
