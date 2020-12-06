import {Event, EventType, Token, TokenType, BooleanValue} from '../parser';
import Interpreter, {Context} from './Interpreter';

const buildIns: {
  [name: string]: (parameters: Event[], context: Context) => Token | void;
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
      (current, {value}) => (current !== '' ? `${current}${value}` : value),
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

export default buildIns;
