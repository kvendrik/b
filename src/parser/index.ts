import parse, {
  Event,
  EventType,
  Operator,
  TokenExpression,
  FunctionCall,
  FunctionExpression,
  GenericExpression,
} from './parse';
import tokenize, {Token, Type as TokenType} from './tokenize';

export function toAST(program: string): Event[] {
  const tokens = tokenize(program);
  return parse(tokens);
}

export {
  Event,
  Token,
  TokenType,
  EventType,
  Operator,
  TokenExpression,
  FunctionCall,
  FunctionExpression,
  GenericExpression,
};
