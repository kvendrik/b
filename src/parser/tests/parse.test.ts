import {Type as TokenType, Token} from '../tokenize';
import parse, {EventType, Operator} from '../parse';

describe('parse()', () => {
  describe('operations', () => {
    it('understands basic calculations', () => {
      expect(
        parse([
          {type: TokenType.Number, value: '2'},
          {type: TokenType.Operation, value: '+'},
          {type: TokenType.Number, value: '8'},
        ]),
      ).toEqual([
        {
          type: EventType.Operation,
          operator: Operator.Add,
          left: {type: TokenType.Number, value: '2'},
          right: {type: TokenType.Number, value: '8'},
        },
      ]);
    });

    it('understands various operators', () => {
      expect(
        parse([
          {type: TokenType.Number, value: '2'},
          {type: TokenType.Operation, value: '*'},
          {type: TokenType.Number, value: '4'},
        ]),
      ).toEqual([
        {
          type: EventType.Operation,
          operator: Operator.Multiply,
          left: {type: TokenType.Number, value: '2'},
          right: {type: TokenType.Number, value: '4'},
        },
      ]);
    });

    it('understands symbols', () => {
      expect(
        parse([
          {type: TokenType.Number, value: '2'},
          {type: TokenType.Operation, value: '*'},
          {type: TokenType.Symbol, value: 'x'},
        ]),
      ).toEqual([
        {
          type: EventType.Operation,
          operator: Operator.Multiply,
          left: {type: TokenType.Number, value: '2'},
          right: {type: TokenType.Symbol, value: 'x'},
        },
      ]);
    });

    it('understands pure symbol calculations', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'x'},
          {type: TokenType.Operation, value: '*'},
          {type: TokenType.Symbol, value: 'y'},
        ]),
      ).toEqual([
        {
          type: EventType.Operation,
          operator: Operator.Multiply,
          left: {type: TokenType.Symbol, value: 'x'},
          right: {type: TokenType.Symbol, value: 'y'},
        },
      ]);
    });

    it('understands complex calculations', () => {
      expect(
        parse([
          {type: TokenType.Number, value: '2'},
          {type: TokenType.Operation, value: '+'},
          {type: TokenType.Number, value: '2'},
          {type: TokenType.Operation, value: '*'},
          {type: TokenType.Number, value: '4'},
          {type: TokenType.Operation, value: '/'},
          {type: TokenType.Number, value: '2'},
        ]),
      ).toEqual([
        {
          type: EventType.Operation,
          operator: Operator.Add,
          left: {type: TokenType.Number, value: '2'},
          right: {
            type: EventType.Operation,
            operator: Operator.Multiply,
            left: {type: TokenType.Number, value: '2'},
            right: {
              type: EventType.Operation,
              operator: Operator.Divide,
              left: {type: TokenType.Number, value: '4'},
              right: {type: TokenType.Number, value: '2'},
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
          {type: TokenType.Operation, value: '+'},
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
              type: EventType.Operation,
              operator: Operator.Add,
              left: {type: TokenType.Symbol, value: 'x'},
              right: {type: TokenType.Symbol, value: 'y'},
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
            {type: TokenType.Symbol, value: 'x'},
            {type: TokenType.Symbol, value: 'y'},
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
            {type: TokenType.Number, value: '2'},
            {type: TokenType.Number, value: '4'},
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
          operator: Operator.Equals,
          left: {type: TokenType.Symbol, value: 'count'},
          right: {
            type: EventType.FunctionCall,
            symbol: 'sum',
            parameters: [
              {type: TokenType.Symbol, value: 'x'},
              {type: TokenType.Symbol, value: 'y'},
            ],
          },
        },
      ]);
    });

    it.skip('understands function calls with a function call as an argument', () => {
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
            {type: TokenType.Symbol, value: 'y'},
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
          {type: TokenType.Operation, value: '+'},
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
              operator: Operator.Equals,
              left: {type: TokenType.Symbol, value: 'count'},
              right: {type: TokenType.Number, value: '120'},
            },
            {
              type: EventType.Operation,
              operator: Operator.Add,
              left: {type: TokenType.Symbol, value: 'x'},
              right: {type: TokenType.Symbol, value: 'count'},
            },
          ],
        },
      ]);
    });

    it.skip('supports nested functions', () => {
      expect(
        parse([
          ...getMockFunction('add', [
            ...getMockFunction('calc', [
              {type: TokenType.Number, value: '2'},
              {type: TokenType.Operation, value: '*'},
              {type: TokenType.Number, value: '2'},
            ]),
            {type: TokenType.Symbol, value: 'calc'},
            {type: TokenType.Special, value: '('},
            {type: TokenType.Special, value: ')'},
            {type: TokenType.Special, value: ';'},
          ]),
          {type: TokenType.Symbol, value: 'add'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Special, value: ')'},
          {type: TokenType.Special, value: ';'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.Equals,
          left: {
            type: TokenType.Symbol,
            value: 'add',
          },
          right: {
            type: EventType.FunctionExpression,
            parameters: [],
            body: [
              {
                type: EventType.Assignment,
                operator: Operator.Equals,
                left: {
                  type: TokenType.Symbol,
                  value: 'calc',
                },
                right: {
                  type: EventType.FunctionExpression,
                  parameters: [],
                  body: [
                    {
                      type: EventType.Operation,
                      operator: Operator.Multiply,
                      left: {
                        type: TokenType.Number,
                        value: '2',
                      },
                      right: {
                        type: TokenType.Number,
                        value: '2',
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
            ],
          },
        },
        {
          type: 'FunctionCall',
          symbol: 'add',
          parameters: [],
        },
      ]);

      function getMockFunction(name: string, body: Token[]) {
        return [
          {type: TokenType.Symbol, value: name},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Special, value: '{'},
          {type: TokenType.Special, value: '('},
          {type: TokenType.Special, value: ')'},
          ...body,
          {type: TokenType.Special, value: '}'},
          {type: TokenType.Special, value: ';'},
        ];
      }
    });
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
          operator: Operator.Equals,
          left: {type: TokenType.Symbol, value: 'my_number'},
          right: {type: TokenType.Number, value: '8'},
        },
      ]);
    });

    it('allows for operations to be assigned', () => {
      expect(
        parse([
          {type: TokenType.Symbol, value: 'my_number'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '2'},
          {type: TokenType.Operation, value: '+'},
          {type: TokenType.Number, value: '8'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.Equals,
          left: {type: TokenType.Symbol, value: 'my_number'},
          right: {
            type: EventType.Operation,
            operator: Operator.Add,
            left: {type: TokenType.Number, value: '2'},
            right: {type: TokenType.Number, value: '8'},
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
          operator: Operator.Equals,
          left: {type: TokenType.Symbol, value: 'my_number'},
          right: {type: TokenType.Number, value: '8'},
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
          {type: TokenType.Operation, value: '+'},
          {type: TokenType.Number, value: '8'},
          {type: TokenType.Special, value: ';'},
          {type: TokenType.Symbol, value: 'my_second_number'},
          {type: TokenType.Special, value: '='},
          {type: TokenType.Number, value: '162'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.Equals,
          left: {type: TokenType.Symbol, value: 'my_number'},
          right: {
            type: EventType.Operation,
            operator: Operator.Add,
            left: {type: TokenType.Number, value: '2'},
            right: {type: TokenType.Number, value: '8'},
          },
        },
        {
          type: EventType.Assignment,
          operator: Operator.Equals,
          left: {type: TokenType.Symbol, value: 'my_second_number'},
          right: {type: TokenType.Number, value: '162'},
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
          {type: TokenType.Operation, value: '+'},
          {type: TokenType.Symbol, value: 'y'},
          {type: TokenType.Special, value: '}'},
        ]),
      ).toEqual([
        {
          type: EventType.Assignment,
          operator: Operator.Equals,
          left: {type: TokenType.Symbol, value: 'sum'},
          right: {
            type: EventType.FunctionExpression,
            parameters: [
              {type: TokenType.Symbol, value: 'x'},
              {type: TokenType.Symbol, value: 'y'},
            ],
            body: [
              {
                type: EventType.Operation,
                operator: Operator.Add,
                left: {type: TokenType.Symbol, value: 'x'},
                right: {type: TokenType.Symbol, value: 'y'},
              },
            ],
          },
        },
      ]);
    });
  });
});
