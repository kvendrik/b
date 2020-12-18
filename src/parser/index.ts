import parse, {
  Event,
  EventType,
  Operator,
  TokenExpression,
  FunctionCall,
  FunctionExpression,
  GenericExpression,
  AssignmentExpression,
  DictionaryExpression,
  MemberExpression,
} from './parse';
import tokenize, {Token, Type as TokenType, BooleanValue} from './tokenize';

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
  AssignmentExpression,
  BooleanValue,
  DictionaryExpression,
  MemberExpression,
};
