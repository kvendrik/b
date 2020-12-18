import {Type as TokenType, Token} from '../../tokenize';
import parse from '../parse';
import {EventType, Operator} from '../resolvers';

describe('parse()', () => {
  describe('literals', () => {
    it('understands programs that only return a string literal', () => {
      expect(parse([{type: TokenType.String, value: 'Hello!'}])).toEqual([
        {
          type: EventType.TokenExpression,
          token: {type: TokenType.String, value: 'Hello!'},
        },
      ]);
    });

    it('understands programs that only return a number literal', () => {
      expect(parse([{type: TokenType.Number, value: '120'}])).toEqual([
        {
          type: EventType.TokenExpression,
          token: {type: TokenType.Number, value: '120'},
        },
      ]);
    });
  });

  describe('member expressions', () => {
    it('understands basic member expressions', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'data'},
          {type: TokenType.Special, value: '['},
          {type: TokenType.String, value: 'country'},
          {type: TokenType.Special, value: ']'},
        ]),
      ).toEqual([
        {
          type: EventType.MemberExpression,
          symbol: {type: TokenType.Symbol, value: 'data'},
          keys: [
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.String, value: 'country'},
            },
          ],
        },
      ]);
    });

    it('understands nested member expressions', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'countries'},
          {type: TokenType.Special, value: '['},
          {type: TokenType.String, value: 'CA'},
          {type: TokenType.Special, value: ']'},
          {type: TokenType.Special, value: '['},
          {type: TokenType.Symbol, value: 'province'},
          {type: TokenType.Special, value: ']'},
        ]),
      ).toEqual([
        {
          type: EventType.MemberExpression,
          symbol: {type: TokenType.Symbol, value: 'countries'},
          keys: [
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.String, value: 'CA'},
            },
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.Symbol, value: 'province'},
            },
          ],
        },
      ]);
    });

    it('can be used to assign values to', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'countries'},
          {type: TokenType.Special, value: '['},
          {type: TokenType.String, value: 'CA'},
          {type: TokenType.Special, value: ']'},
          {type: TokenType.Special, value: '['},
          {type: TokenType.Symbol, value: 'province'},
          {type: TokenType.Special, value: ']'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.String, value: 'ON'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.MemberExpression,
            symbol: {type: TokenType.Symbol, value: 'countries'},
            keys: [
              {
                type: EventType.TokenExpression,
                token: {type: TokenType.String, value: 'CA'},
              },
              {
                type: EventType.TokenExpression,
                token: {type: TokenType.Symbol, value: 'province'},
              },
            ],
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.String, value: 'ON'},
          },
        },
      ]);
    });
  });

  describe('dictionary expressions', () => {
    it('understands basic dictionaries', () => {
      expect(
        parse([
          {type: TokenType.Special, value: '{'},
          {type: TokenType.String, value: 'animal'},
          {type: TokenType.Special, value: ':'},
          {type: TokenType.String, value: 'cat'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.DictionaryExpression,
          body: [
            {
              key: {type: TokenType.String, value: 'animal'},
              value: {
                type: EventType.TokenExpression,
                token: {type: TokenType.String, value: 'cat'},
              },
            },
          ],
        },
      ]);
    });

    it('understands dictionaries with operation values', () => {
      expect(
        parse([
          {type: TokenType.Special, value: '{'},
          {type: TokenType.String, value: 'animal'},
          {type: TokenType.Special, value: ':'},
          {type: TokenType.Number, value: '2'},
          {type: TokenType.MathOperation, value: '*'},
          {type: TokenType.Number, value: '2'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.DictionaryExpression,
          body: [
            {
              key: {type: TokenType.String, value: 'animal'},
              value: {
                type: EventType.MathOperation,
                operator: Operator.Multiply,
                left: {
                  type: EventType.TokenExpression,
                  token: {type: TokenType.Number, value: '2'},
                },
                right: {
                  type: EventType.TokenExpression,
                  token: {type: TokenType.Number, value: '2'},
                },
              },
            },
          ],
        },
      ]);
    });

    it('understands dictionaries with symbols', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'count'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '120'},
          {type: TokenType.Special, value: ';'},
          {type: TokenType.Special, value: '{'},
          {type: TokenType.String, value: 'count'},
          {type: TokenType.Special, value: ':'},
          {type: TokenType.Symbol, value: 'count'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'count'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '120'},
          },
        },
        {
          type: EventType.DictionaryExpression,
          body: [
            {
              key: {type: TokenType.String, value: 'count'},
              value: {
                type: EventType.TokenExpression,
                token: {type: TokenType.Symbol, value: 'count'},
              },
            },
          ],
        },
      ]);
    });

    it('understands nested dictionaries', () => {
      expect(
        parse([
          {type: TokenType.Special, value: '{'},
          {type: TokenType.String, value: 'data'},
          {type: TokenType.Special, value: ':'},
          {type: TokenType.Special, value: '{'},
          {type: TokenType.String, value: 'country'},
          {type: TokenType.Special, value: ':'},
          {type: TokenType.String, value: 'CA'},
          {type: TokenType.Special, value: '}'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.DictionaryExpression,
          body: [
            {
              key: {type: TokenType.String, value: 'data'},
              value: {
                type: EventType.DictionaryExpression,
                body: [
                  {
                    key: {type: TokenType.String, value: 'country'},
                    value: {
                      type: EventType.TokenExpression,
                      token: {type: TokenType.String, value: 'CA'},
                    },
                  },
                ],
              },
            },
          ],
        },
      ]);
    });

    it('understands dictionary variable assignments', () => {
      expect(
        parse([
          {type: TokenType.String, value: 'data'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Special, value: '{'},
          {type: TokenType.String, value: 'country'},
          {type: TokenType.Special, value: ':'},
          {type: TokenType.String, value: 'CA'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.String, value: 'data'},
          },
          right: {
            type: EventType.DictionaryExpression,
            body: [
              {
                key: {type: TokenType.String, value: 'country'},
                value: {
                  type: EventType.TokenExpression,
                  token: {type: TokenType.String, value: 'CA'},
                },
              },
            ],
          },
        },
      ]);
    });
  });

  describe('tests', () => {
    it('understands basic equality evaluations', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'count'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '120'},
        ]),
      ).toEqual([
        {
          type: EventType.Test,
          operator: Operator.Equals,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'count'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '120'},
          },
        },
      ]);
    });

    it('understands negative equality evaluations', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'count'},
          {type: TokenType.Special, value: '!'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '120'},
        ]),
      ).toEqual([
        {
          type: EventType.Test,
          operator: Operator.NegativeEquals,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'count'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '120'},
          },
        },
      ]);
    });

    it('understands negative equality evaluations on strings', () => {
      expect(
        parse([
          {type: TokenType.String, value: 'Hello!'},
          {type: TokenType.Special, value: '!'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.String, value: 'Hey'},
        ]),
      ).toEqual([
        {
          type: EventType.Test,
          operator: Operator.NegativeEquals,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.String, value: 'Hello!'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.String, value: 'Hey'},
          },
        },
      ]);
    });

    it('understands bigger than evaluations', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'count'},
          {type: TokenType.Special, value: Operator.BiggerThan},
          {type: TokenType.Number, value: '120'},
        ]),
      ).toEqual([
        {
          type: EventType.Test,
          operator: Operator.BiggerThan,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'count'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '120'},
          },
        },
      ]);
    });

    it('understands smaller than evaluations', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'count'},
          {type: TokenType.Special, value: Operator.SmallerThan},
          {type: TokenType.Number, value: '120'},
        ]),
      ).toEqual([
        {
          type: EventType.Test,
          operator: Operator.SmallerThan,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'count'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '120'},
          },
        },
      ]);
    });
  });

  describe('operations', () => {
    it('understands basic calculations', () => {
      expect(
        parse([
          {type: TokenType.Number, value: '2'},
          {type: TokenType.MathOperation, value: '+'},
          {type: TokenType.Number, value: '8'},
        ]),
      ).toEqual([
        {
          type: EventType.MathOperation,
          operator: Operator.Add,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '2'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '8'},
          },
        },
      ]);
    });

    it('understands remainders', () => {
      expect(
        parse([
          {type: TokenType.Number, value: '10'},
          {type: TokenType.MathOperation, value: '%'},
          {type: TokenType.Number, value: '2'},
        ]),
      ).toEqual([
        {
          type: EventType.MathOperation,
          operator: Operator.Remainder,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '10'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '2'},
          },
        },
      ]);
    });

    it('understands various operators', () => {
      expect(
        parse([
          {type: TokenType.Number, value: '2'},
          {type: TokenType.MathOperation, value: '*'},
          {type: TokenType.Number, value: '4'},
        ]),
      ).toEqual([
        {
          type: EventType.MathOperation,
          operator: Operator.Multiply,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '2'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '4'},
          },
        },
      ]);
    });

    it('understands symbols', () => {
      expect(
        parse([
          {type: TokenType.Number, value: '2'},
          {type: TokenType.MathOperation, value: '*'},
          {type: TokenType.Symbol, value: 'x'},
        ]),
      ).toEqual([
        {
          type: EventType.MathOperation,
          operator: Operator.Multiply,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '2'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'x'},
          },
        },
      ]);
    });

    it('understands pure symbol calculations', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.MathOperation, value: '*'},
          {type: TokenType.Symbol, value: 'y'},
        ]),
      ).toEqual([
        {
          type: EventType.MathOperation,
          operator: Operator.Multiply,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'x'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'y'},
          },
        },
      ]);
    });

    it('understands complex calculations', () => {
      expect(
        parse([
          {type: TokenType.Number, value: '2'},
          {type: TokenType.MathOperation, value: '+'},
          {type: TokenType.Number, value: '2'},
          {type: TokenType.MathOperation, value: '*'},
          {type: TokenType.Number, value: '4'},
          {type: TokenType.MathOperation, value: '/'},
          {type: TokenType.Number, value: '2'},
        ]),
      ).toEqual([
        {
          type: EventType.MathOperation,
          operator: Operator.Add,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '2'},
          },
          right: {
            type: EventType.MathOperation,
            operator: Operator.Multiply,
            left: {
              type: EventType.TokenExpression,
              token: {type: TokenType.Number, value: '2'},
            },
            right: {
              type: EventType.MathOperation,
              operator: Operator.Divide,
              left: {
                type: EventType.TokenExpression,
                token: {type: TokenType.Number, value: '4'},
              },
              right: {
                type: EventType.TokenExpression,
                token: {type: TokenType.Number, value: '2'},
              },
            },
          },
        },
      ]);
    });
  });

  describe('functions', () => {
    it('understands function expressions', () => {
      expect(
        parse([
          {type: TokenType.Special, value: '{'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.Special, value: ','},
          {type: TokenType.Symbol, value: 'y'},
          {type: TokenType.Special, value: ')'},
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.MathOperation, value: '+'},
          {type: TokenType.Symbol, value: 'y'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.FunctionExpression,
          parameters: [
            {type: TokenType.Symbol, value: 'x'},
            {type: TokenType.Symbol, value: 'y'},
          ],
          body: [
            {
              type: EventType.MathOperation,
              operator: Operator.Add,
              left: {
                type: EventType.TokenExpression,
                token: {type: TokenType.Symbol, value: 'x'},
              },
              right: {
                type: EventType.TokenExpression,
                token: {type: TokenType.Symbol, value: 'y'},
              },
            },
          ],
        },
      ]);
    });

    it('understands function expressions that return a string', () => {
      expect(
        parse([
          {type: TokenType.Special, value: '{'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Special, value: ')'},
          {type: TokenType.String, value: 'Hello!'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.FunctionExpression,
          parameters: [],
          body: [
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.String, value: 'Hello!'},
            },
          ],
        },
      ]);
    });

    it('understands function calls', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'sum'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.Special, value: ','},
          {type: TokenType.Symbol, value: 'y'},
          {type: TokenType.Special, value: ')'},
        ]),
      ).toEqual([
        {
          type: EventType.FunctionCall,
          symbol: 'sum',
          parameters: [
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.Symbol, value: 'x'},
            },
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.Symbol, value: 'y'},
            },
          ],
        },
      ]);
    });

    it('understands function calls with literals', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'sum'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Number, value: '2'},
          {type: TokenType.Special, value: ','},
          {type: TokenType.Number, value: '4'},
          {type: TokenType.Special, value: ')'},
        ]),
      ).toEqual([
        {
          type: EventType.FunctionCall,
          symbol: 'sum',
          parameters: [
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.Number, value: '2'},
            },
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.Number, value: '4'},
            },
          ],
        },
      ]);
    });

    it('understands function calls with function expressions', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'sum'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Number, value: '2'},
          {type: TokenType.Special, value: ','},
          ...getMockFunctionExpression([
            {type: TokenType.Number, value: 'Hello!'},
          ]),
          {type: TokenType.Special, value: ')'},
        ]),
      ).toEqual([
        {
          type: EventType.FunctionCall,
          symbol: 'sum',
          parameters: [
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.Number, value: '2'},
            },
            {
              type: EventType.FunctionExpression,
              parameters: [],
              body: [
                {
                  type: EventType.TokenExpression,
                  token: {type: TokenType.Number, value: 'Hello!'},
                },
              ],
            },
          ],
        },
      ]);
    });

    it('understands function calls in variable assignments', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'count'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Symbol, value: 'sum'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.Special, value: ','},
          {type: TokenType.Symbol, value: 'y'},
          {type: TokenType.Special, value: ')'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'count'},
          },
          right: {
            type: EventType.FunctionCall,
            symbol: 'sum',
            parameters: [
              {
                type: EventType.TokenExpression,
                token: {type: TokenType.Symbol, value: 'x'},
              },
              {
                type: EventType.TokenExpression,
                token: {type: TokenType.Symbol, value: 'y'},
              },
            ],
          },
        },
      ]);
    });

    it('understands function calls with a function call as an argument', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'sum'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Symbol, value: 'calc'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Special, value: ')'},
          {type: TokenType.Special, value: ','},
          {type: TokenType.Symbol, value: 'y'},
          {type: TokenType.Special, value: ')'},
        ]),
      ).toEqual([
        {
          type: EventType.FunctionCall,
          symbol: 'sum',
          parameters: [
            {
              type: EventType.FunctionCall,
              symbol: 'calc',
              parameters: [],
            },
            {
              type: EventType.TokenExpression,
              token: {type: TokenType.Symbol, value: 'y'},
            },
          ],
        },
      ]);
    });

    it('supports multiline function bodies', () => {
      expect(
        parse([
          {type: TokenType.Special, value: '{'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.Special, value: ')'},
          {type: TokenType.Symbol, value: 'count'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '120'},
          {type: TokenType.Special, value: ';'},
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.MathOperation, value: '+'},
          {type: TokenType.Symbol, value: 'count'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.FunctionExpression,
          parameters: [{type: TokenType.Symbol, value: 'x'}],
          body: [
            {
              type: EventType.Assignment,
              operator: Operator.AssignmentSplit,
              left: {
                type: EventType.TokenExpression,
                token: {type: TokenType.Symbol, value: 'count'},
              },
              right: {
                type: EventType.TokenExpression,
                token: {type: TokenType.Number, value: '120'},
              },
            },
            {
              type: EventType.MathOperation,
              operator: Operator.Add,
              left: {
                type: EventType.TokenExpression,
                token: {type: TokenType.Symbol, value: 'x'},
              },
              right: {
                type: EventType.TokenExpression,
                token: {type: TokenType.Symbol, value: 'count'},
              },
            },
          ],
        },
      ]);
    });

    it('supports nested functions', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'add'},
          {type: TokenType.Special, value: '='},
          ...getMockFunctionExpression([
            {type: TokenType.Symbol, value: 'calc'},
            {type: TokenType.Special, value: '='},
            ...getMockFunctionExpression([
              {type: TokenType.Number, value: '2'},
              {type: TokenType.MathOperation, value: '*'},
              {type: TokenType.Number, value: '2'},
            ]),
            {type: TokenType.Special, value: ';'},
            {type: TokenType.Symbol, value: 'calc'},
            {type: TokenType.Special, value: '('},
            {type: TokenType.Special, value: ')'},
            {type: TokenType.Special, value: ';'},
          ]),
          {type: TokenType.Special, value: ';'},
          {type: TokenType.Symbol, value: 'add'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Special, value: ')'},
          {type: TokenType.Special, value: ';'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {
              type: TokenType.Symbol,
              value: 'add',
            },
          },
          right: {
            type: EventType.FunctionExpression,
            parameters: [],
            body: [
              {
                type: EventType.Assignment,
                operator: Operator.AssignmentSplit,
                left: {
                  type: EventType.TokenExpression,
                  token: {
                    type: TokenType.Symbol,
                    value: 'calc',
                  },
                },
                right: {
                  type: EventType.FunctionExpression,
                  parameters: [],
                  body: [
                    {
                      type: EventType.MathOperation,
                      operator: Operator.Multiply,
                      left: {
                        type: EventType.TokenExpression,
                        token: {
                          type: TokenType.Number,
                          value: '2',
                        },
                      },
                      right: {
                        type: EventType.TokenExpression,
                        token: {
                          type: TokenType.Number,
                          value: '2',
                        },
                      },
                    },
                  ],
                },
              },
              {
                type: 'FunctionCall',
                symbol: 'calc',
                parameters: [],
              },
            ],
          },
        },
        {
          type: 'FunctionCall',
          symbol: 'add',
          parameters: [],
        },
      ]);
    });

    function getMockFunctionExpression(body: Token[]) {
      return [
        {type: TokenType.Special, value: '{'},
        {type: TokenType.Special, value: '('},
        {type: TokenType.Special, value: ')'},
        ...body,
        {type: TokenType.Special, value: '}'},
      ];
    }
  });

  describe('variable assignments', () => {
    it('understands basic variable assignments', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'my_number'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '8'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'my_number'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '8'},
          },
        },
      ]);
    });

    it('allows for operations to be assigned', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'my_number'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '2'},
          {type: TokenType.MathOperation, value: '+'},
          {type: TokenType.Number, value: '8'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'my_number'},
          },
          right: {
            type: EventType.MathOperation,
            operator: Operator.Add,
            left: {
              type: EventType.TokenExpression,
              token: {type: TokenType.Number, value: '2'},
            },
            right: {
              type: EventType.TokenExpression,
              token: {type: TokenType.Number, value: '8'},
            },
          },
        },
      ]);
    });

    it('understands basic variable checks', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'my_number'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '8'},
          {type: TokenType.Special, value: ';'},
          {type: TokenType.Symbol, value: 'my_number'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'my_number'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '8'},
          },
        },
        {
          type: EventType.TokenExpression,
          token: {type: TokenType.Symbol, value: 'my_number'},
        },
      ]);
    });

    it('allows for multiple assignments at once', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'my_number'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '2'},
          {type: TokenType.MathOperation, value: '+'},
          {type: TokenType.Number, value: '8'},
          {type: TokenType.Special, value: ';'},
          {type: TokenType.Symbol, value: 'my_second_number'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '162'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'my_number'},
          },
          right: {
            type: EventType.MathOperation,
            operator: Operator.Add,
            left: {
              type: EventType.TokenExpression,
              token: {type: TokenType.Number, value: '2'},
            },
            right: {
              type: EventType.TokenExpression,
              token: {type: TokenType.Number, value: '8'},
            },
          },
        },
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'my_second_number'},
          },
          right: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Number, value: '162'},
          },
        },
      ]);
    });

    it('allows for function assignments', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'sum'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Special, value: '{'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.Special, value: ','},
          {type: TokenType.Symbol, value: 'y'},
          {type: TokenType.Special, value: ')'},
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.MathOperation, value: '+'},
          {type: TokenType.Symbol, value: 'y'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.AssignmentSplit,
          left: {
            type: EventType.TokenExpression,
            token: {type: TokenType.Symbol, value: 'sum'},
          },
          right: {
            type: EventType.FunctionExpression,
            parameters: [
              {type: TokenType.Symbol, value: 'x'},
              {type: TokenType.Symbol, value: 'y'},
            ],
            body: [
              {
                type: EventType.MathOperation,
                operator: Operator.Add,
                left: {
                  type: EventType.TokenExpression,
                  token: {type: TokenType.Symbol, value: 'x'},
                },
                right: {
                  type: EventType.TokenExpression,
                  token: {type: TokenType.Symbol, value: 'y'},
                },
              },
            ],
          },
        },
      ]);
    });
  });
});
