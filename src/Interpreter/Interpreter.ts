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
} from '../parser';

export enum ObfuscatedValue {
  Function = '[Function]',
}

type StoredExpression = Token | FunctionExpression;

export default class Interpreter {
  constructor(
    private context: Map<string, StoredExpression> = new Map<
      string,
      StoredExpression
    >(),
  ) {}

  evaluate(events: Event[]): string | void {
    for (const event of events) {
      switch (event.type) {
        case EventType.Assignment:
          this.handleAssignment(event);
          break;
        case EventType.Operation:
          return this.handleOperation(event);
        case EventType.TokenExpression:
          return this.handleTokenExpression(event);
        case EventType.FunctionCall:
          return this.handleFunctionCall(event);
      }
    }
  }

  private handleOperation({operator, left, right}: GenericExpression) {
    if (right == null) {
      throw new Error('Operation missing right side.');
    }

    // const operationsOrder = [
    //   Operator.Multiply,
    //   Operator.Divide,
    //   Operator.Add,
    //   Operator.Subtract,
    // ];

    if (this.isToken(left) && this.isToken(right)) {
      return this.resolveOperation(operator, left, right).toString();
    }
  }

  private resolveOperation(operator: Operator, left: Token, right: Token) {
    const leftExpression = this.resolveExpression(left);
    const rightExpression = this.resolveExpression(right);

    if (
      !this.isToken(leftExpression) ||
      !this.isToken(rightExpression) ||
      leftExpression.type !== TokenType.Number ||
      rightExpression.type !== TokenType.Number
    ) {
      throw new Error('Can only execute math operations on numbers.');
    }

    switch (operator) {
      case Operator.Multiply:
        return Number(leftExpression.value) * Number(rightExpression.value);
      case Operator.Divide:
        return Number(leftExpression.value) / Number(rightExpression.value);
      case Operator.Add:
        return Number(leftExpression.value) + Number(rightExpression.value);
      case Operator.Subtract:
        return Number(leftExpression.value) + Number(rightExpression.value);
      default:
        throw new Error(`Unknown operator ${operator}`);
    }
  }

  private handleFunctionCall({symbol, parameters}: FunctionCall) {
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
    callParameters: Token[],
  ) {
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
      return '';
    }

    const initialContext =
      parameters == null
        ? undefined
        : [...parameters.entries()].reduce(
            (current, [index, {value}]) =>
              current.set(value, this.resolveExpression(callParameters[index])),
            new Map<string, StoredExpression>(),
          );

    const subInterpreter = new Interpreter(initialContext);
    return subInterpreter.evaluate(body);
  }

  private handleTokenExpression({token}: TokenExpression) {
    const expression = this.resolveExpression(token);

    if (this.isToken(expression)) {
      return expression.value;
    }

    return ObfuscatedValue.Function;
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
      default:
        throw new Error(`Right side of ${left.value} is empty.`);
    }
  }

  private isToken(expression: Event | Token): expression is Token {
    return (expression as Token).value !== undefined;
  }
}
