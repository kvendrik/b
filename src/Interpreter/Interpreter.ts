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
} from '../parser';

export enum ObfuscatedValue {
  Function = '[Function]',
}

enum Keyword {
  Break = 'break',
}

type StoredExpression = Token | FunctionExpression;

const BUILT_INS: {
  [name: string]: (
    parameters: Event[],
    context: Map<string, StoredExpression>,
  ) => Token | void;
} = {
  log: (parameters, context) => {
    const tokens = parameters.map((parameter) => {
      const interpreter = new Interpreter(context);
      return interpreter.evaluate([parameter]);
    });
    console.log(...tokens.map((token) => (token ? token.value : null)));
  },
  concat(parameters, context) {
    const tokens = parameters.map((parameter) => {
      const interpreter = new Interpreter(context);
      return interpreter.evaluate([parameter]);
    });

    if (
      tokens.some(
        (token) =>
          token == null ||
          (token.type !== TokenType.String && token.type !== TokenType.Number),
      )
    ) {
      throw new Error('concat() can only be used with strings');
    }

    const resolvedTokens = tokens as Token[];
    const resultString = resolvedTokens.reduce(
      (current, {value}) => (current !== '' ? `${current} ${value}` : value),
      '',
    );
    return {type: TokenType.String, value: resultString};
  },
  if([testEvent, handlerEvent], context) {
    const interpreter = new Interpreter(context);
    const testResult = interpreter.evaluate([testEvent]);

    if (
      testResult == null ||
      testResult.type !== TokenType.Boolean ||
      testResult.value !== BooleanValue.True
    ) {
      return;
    }

    if (handlerEvent.type !== EventType.FunctionExpression) {
      const handlerResult = interpreter.evaluate([handlerEvent]);
      return handlerResult;
    }

    if (handlerEvent.body == null) {
      throw new Error(
        'Tried to resolve if() using function call but function has no body.',
      );
    }

    return interpreter.evaluate(handlerEvent.body);
  },
  while([testEvent, handlerEvent], context) {
    const interpreter = new Interpreter(context);
    let testResult = interpreter.evaluate([testEvent]);

    if (
      testResult == null ||
      testResult.type !== TokenType.Boolean ||
      testResult.value !== BooleanValue.True
    ) {
      return;
    }

    if (handlerEvent.type !== EventType.FunctionExpression) {
      throw new Error('while() handler is not a function.');
    }

    if (handlerEvent.body == null) {
      throw new Error('while() handler has no body.');
    }

    interpreter.evaluate(handlerEvent.body);
    this.while([testEvent, handlerEvent], context);
  },
};

export default class Interpreter {
  constructor(
    private context: Map<string, StoredExpression> = new Map<
      string,
      StoredExpression
    >(),
  ) {}

  evaluate(events: Event[]): Token | void {
    for (const [index, event] of events.entries()) {
      const isLastEvent = index === events.length - 1;
      switch (event.type) {
        case EventType.Assignment:
          this.handleAssignment(event);
          break;
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

  private handleTest(event: GenericExpression): Token | void {
    if (event.right == null) {
      throw new Error('Test missing right side.');
    }

    if (!this.isToken(event.left) || !this.isToken(event.right)) {
      throw new Error('Tests can only be used with tokens.');
    }

    if (
      event.operator === Operator.Equals ||
      event.operator === Operator.NegativeEquals
    ) {
      const leftExpression = this.resolveExpression(event.left);
      const rightExpression = this.resolveExpression(event.right);

      if (!this.isToken(leftExpression) || !this.isToken(rightExpression)) {
        throw new Error('Tests can only run equality checks on tokens.');
      }

      const value =
        leftExpression.type === rightExpression.type &&
        leftExpression.value === rightExpression.value;

      return {
        type: TokenType.Boolean,
        value:
          event.operator === Operator.Equals
            ? value === true
              ? BooleanValue.True
              : BooleanValue.False
            : value === false
            ? BooleanValue.True
            : BooleanValue.False,
      };
    }

    const {left, right} = this.validateNumericOperation(
      event.left,
      event.right,
    );

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

  private validateNumericOperation(left: Token, right: Token) {
    const leftExpression = this.resolveExpression(left);
    const rightExpression = this.resolveExpression(right);

    if (
      !this.isToken(leftExpression) ||
      !this.isToken(rightExpression) ||
      leftExpression.type !== TokenType.Number ||
      rightExpression.type !== TokenType.Number
    ) {
      throw new Error('Can only execute numeric operations on numbers.');
    }

    return {left: leftExpression, right: rightExpression};
  }

  private handleMathOperation({
    operator,
    left,
    right,
  }: GenericExpression): Token | void {
    if (right == null) {
      throw new Error('Operation missing right side.');
    }

    if (this.isToken(left) && this.isToken(right)) {
      return this.resolveMathOperation(operator, left, right);
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
    const builtIn = BUILT_INS[symbol];

    if (builtIn) {
      return builtIn.call(BUILT_INS, parameters, this.context);
    }

    const functionExpression = this.context.get(symbol);

    if (functionExpression === undefined) {
      throw new Error(`Function ${symbol} is not defined.`);
    }

    if (this.isToken(functionExpression)) {
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
            return current.set(value, parameterValue);
          }, this.context);

    const subInterpreter = new Interpreter(initialContext);
    return subInterpreter.evaluate(body);
  }

  private handleTokenExpression({token}: TokenExpression) {
    const expression = this.resolveExpression(token);

    if (this.isToken(expression)) {
      return expression;
    }

    return {type: TokenType.String, value: ObfuscatedValue.Function};
  }

  private resolveExpression({type, value}: Token) {
    if (type !== TokenType.Symbol) {
      return {type, value};
    }

    const storedValue = this.context.get(value);

    if (storedValue === undefined) {
      throw new Error(`${value} is not defined.`);
    }

    return storedValue;
  }

  private handleAssignment({left, right}: GenericExpression) {
    if (left.type !== TokenType.Symbol) {
      throw new Error('Can’t assign values to a non-symbol.');
    }

    if (right == null) {
      throw new Error(
        `Symbol ${left.value} does not specify a value to be assigned to it.`,
      );
    }

    if (this.isToken(right)) {
      this.context.set(left.value, right);
      return;
    }

    switch (right.type) {
      case EventType.FunctionExpression:
        this.context.set(left.value, right);
        break;
      case EventType.MathOperation:
        const result = this.handleMathOperation(right);
        if (result == null)
          throw new Error(
            `Math operation could not be resolved for ${left.value}.`,
          );
        this.context.set(left.value, result);
        break;
      case EventType.FunctionCall:
        const value = this.handleFunctionCall(right);
        if (value == null)
          throw new Error(
            `Call to ${right.symbol} resulted in void which cannot be assigned to ${left.value}.`,
          );
        this.context.set(left.value, value);
        break;
      default:
        throw new Error(`Right side of ${left.value} is empty.`);
    }
  }

  private isToken(expression: Event | Token): expression is Token {
    return (expression as Token).value !== undefined;
  }
}
