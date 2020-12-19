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

enum Keyword {
  Break = 'break',
}

export default class Interpreter {
  constructor(private context: Context = new Map<string, StoredExpression>()) {}

  evaluate(events: Event[]): Token | void {
    for (const [index, event] of events.entries()) {
      const isLastEvent = index === events.length - 1;
      switch (event.type) {
        case EventType.Assignment:
          this.handleAssignment(event);
          break;
        case EventType.FunctionExpression:
          return {type: TokenType.String, value: ObfuscatedValue.Function};
        case EventType.DictionaryExpression:
          return {type: TokenType.String, value: ObfuscatedValue.Dictionary};
        case EventType.MemberExpression:
          return this.handleMemberExpressionAction('get', event);
        case EventType.Test:
          return this.handleTest(event);
        case EventType.MathOperation:
          return this.handleMathOperation(event);
        case EventType.TokenExpression:
          if (event.token.value === Keyword.Break) return;
          return this.handleTokenExpression(event);
        case EventType.FunctionCall:
          const result = this.handleFunctionCall(event);
          if (isLastEvent) return result;
      }
    }
  }

  private handleMemberExpressionAction(
    type: 'get' | 'set',
    event: MemberExpression,
    newValueEvent?: Event,
  ) {
    if (type === 'set' && !newValueEvent)
      throw new Error('New value is requied when setting a dictionary value.');

    const dictionaryExpression = this.resolveStoredValue(event.symbol);

    const subInterpreter = new Interpreter(this.context);
    let currentDictionaryExpression = dictionaryExpression;

    for (const key of event.keys) {
      if (currentDictionaryExpression.type !== EventType.DictionaryExpression) {
        throw new Error(`${event.symbol} is not a dictionary.`);
      }

      const resolvedKey = subInterpreter.evaluate([key]);

      if (resolvedKey == null)
        throw new Error(`Key on ${event.symbol} could not be resolved.`);

      const dictionaryPairEntry = [
        ...currentDictionaryExpression.body.entries(),
      ].find(([, {key}]) => key.value === resolvedKey.value);

      if (dictionaryPairEntry == null)
        throw new Error(`Key on ${event.symbol} is undefined.`);

      const [dictionaryPairIndex, dictionaryPair] = dictionaryPairEntry;

      if (dictionaryPair.value.type === EventType.TokenExpression) {
        if (type === 'get') return dictionaryPair.value.token;
        currentDictionaryExpression.body[
          dictionaryPairIndex
        ].value = newValueEvent!;
        return;
      }

      if (dictionaryPair.value.type === EventType.DictionaryExpression) {
        currentDictionaryExpression = dictionaryPair.value;
        continue;
      }

      throw new Error(
        `Could not resolve dictionary value on ${event.symbol}. Only token literals and dictionaries are valid values.`,
      );
    }
  }

  private handleTest(event: GenericExpression): Token | void {
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

      return {
        type: TokenType.Boolean,
        value:
          event.operator === Operator.Equals
            ? testResult === true
              ? BooleanValue.True
              : BooleanValue.False
            : testResult === false
            ? BooleanValue.True
            : BooleanValue.False,
      };
    }

    const {left, right} = this.validateNumericOperation(leftToken, rightToken);

    switch (event.operator) {
      case Operator.BiggerThan:
        return {
          type: TokenType.Boolean,
          value:
            Number(left.value) > Number(right.value)
              ? BooleanValue.True
              : BooleanValue.False,
        };
      case Operator.SmallerThan:
        return {
          type: TokenType.Boolean,
          value:
            Number(left.value) < Number(right.value)
              ? BooleanValue.True
              : BooleanValue.False,
        };
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
  }: GenericExpression): Token | void {
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
  ): Token {
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

    return {type: TokenType.Number, value: outcome.toString()};
  }

  private handleFunctionCall({symbol, parameters}: FunctionCall): Token | void {
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
  ): Token | void {
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
            const parameterValue = resolvedParameters[index];
            if (!parameterValue) {
              throw new Error(
                `Call to ${symbol} has parameter that resolved to incompatible value void.`,
              );
            }
            return current.set(value, {
              type: EventType.TokenExpression,
              token: parameterValue,
            });
          }, this.context);

    const subInterpreter = new Interpreter(initialContext);
    return subInterpreter.evaluate(body);
  }

  private handleTokenExpression({token}: TokenExpression) {
    const expression = this.resolveStoredValue(token);

    if (expression.type === EventType.TokenExpression) {
      return expression.token;
    }

    if (expression.type === EventType.DictionaryExpression) {
      return {type: TokenType.String, value: ObfuscatedValue.Dictionary};
    }

    return {type: TokenType.String, value: ObfuscatedValue.Function};
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

    let token;

    switch (right.type) {
      case EventType.FunctionExpression:
      case EventType.DictionaryExpression:
      case EventType.TokenExpression:
        this.context.set(leftToken.value, right);
        break;
      case EventType.MathOperation:
        token = this.handleMathOperation(right);
        if (token == null)
          throw new Error(
            `Math operation could not be resolved for ${leftToken.value}.`,
          );
        this.context.set(leftToken.value, {
          type: EventType.TokenExpression,
          token,
        });
        break;
      case EventType.FunctionCall:
        token = this.handleFunctionCall(right);
        if (token == null)
          throw new Error(
            `Call to ${right.symbol} resulted in void which cannot be assigned to ${leftToken.value}.`,
          );
        this.context.set(leftToken.value, {
          type: EventType.TokenExpression,
          token,
        });
        break;
      default:
        throw new Error(`Right side of ${leftToken.value} is empty.`);
    }
  }
}
