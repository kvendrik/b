import {Event, EventType, TokenType, BooleanValue} from '../parser';
import Interpreter, {
  Context,
  NonResolvableExpression,
  tokenToExpression,
} from './Interpreter';

const buildIns: {
  [name: string]: (
    parameters: Event[],
    context: Context,
  ) => NonResolvableExpression | void;
} = {
  log: (parameters, context) => {
    const expressions = parameters.map((parameter) => {
      const interpreter = new Interpreter(context);
      return interpreter.evaluate([parameter]);
    });
    console.log(
      ...expressions.map((expression) => {
        if (expression == null) return null;
        const {value} = Interpreter.toSingleToken(expression);
        return value;
      }),
    );
  },

  concat(parameters, context) {
    const expressions = parameters.map((parameter) => {
      const interpreter = new Interpreter(context);
      return interpreter.evaluate([parameter]);
    });

    if (
      expressions.some(
        (expression) =>
          expression == null ||
          expression.type !== EventType.TokenExpression ||
          (expression.token.type !== TokenType.String &&
            expression.token.type !== TokenType.Number),
      )
    ) {
      throw new Error('concat() can only be used with strings');
    }

    return tokenToExpression({
      type: TokenType.String,
      value: expressions.reduce(
        (current, expression) =>
          expression == null
            ? current
            : `${current}${Interpreter.toSingleToken(expression).value}`,
        '',
      ),
    });
  },

  defined([assignmentLeftHand], context) {
    if (
      (assignmentLeftHand.type !== EventType.TokenExpression ||
        assignmentLeftHand.token.type !== TokenType.Symbol) &&
      assignmentLeftHand.type !== EventType.MemberExpression
    ) {
      throw new Error(
        'Assignment left hand can only be a member expression or symbol.',
      );
    }

    if (assignmentLeftHand.type === EventType.TokenExpression) {
      return tokenToExpression({
        type: TokenType.Boolean,
        value: Boolean(context.get(assignmentLeftHand.token.value))
          ? BooleanValue.True
          : BooleanValue.False,
      });
    }

    const interpreter = new Interpreter(context);
    let isDefined = false;

    try {
      isDefined = Boolean(interpreter.evaluate([assignmentLeftHand]));
    } catch {}

    return tokenToExpression({
      type: TokenType.Boolean,
      value: isDefined ? BooleanValue.True : BooleanValue.False,
    });
  },

  if([testEvent, consequentEvent, alternateEvent], context) {
    const interpreter = new Interpreter(context);
    const testResult = interpreter.evaluate([testEvent]);
    let handlerEvent = consequentEvent;

    if (testResult == null) throw new Error('Test could not be resolved.');
    if (testResult.type !== EventType.TokenExpression)
      throw new Error(`A ${testResult.type} is not a valid test.`);

    if (
      testResult == null ||
      testResult.token.type !== TokenType.Boolean ||
      testResult.token.value !== BooleanValue.True
    ) {
      if (alternateEvent == null) return;
      handlerEvent = alternateEvent;
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

    if (testResult == null) throw new Error('Test could not be resolved.');
    if (testResult.type !== EventType.TokenExpression)
      throw new Error(`A ${testResult.type} is not a valid test.`);

    if (
      testResult == null ||
      testResult.token.type !== TokenType.Boolean ||
      testResult.token.value !== BooleanValue.True
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

export default buildIns;
