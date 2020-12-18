import tokenize, {Type} from '../tokenize';

describe('tokenize()', () => {
  describe('operations', () => {
    it('accepts basic operations', () => {
      const input = '2 + 4';
      expect(tokenize(input)).toEqual([
        {type: Type.Number, value: '2'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Number, value: '4'},
      ]);
    });

    it('accepts advanced operations', () => {
      const input = '2 / 2 * 42 + 728';
      expect(tokenize(input)).toEqual([
        {type: Type.Number, value: '2'},
        {type: Type.MathOperation, value: '/'},
        {type: Type.Number, value: '2'},
        {type: Type.MathOperation, value: '*'},
        {type: Type.Number, value: '42'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Number, value: '728'},
      ]);
    });
  });

  describe('numbers', () => {
    it('accepts big numbers', () => {
      const input = '2 + 452';
      expect(tokenize(input)).toEqual([
        {type: Type.Number, value: '2'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Number, value: '452'},
      ]);
    });
  });

  describe('strings', () => {
    it('accepts strings', () => {
      const input = '2 + "hello"';
      expect(tokenize(input)).toEqual([
        {type: Type.Number, value: '2'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.String, value: 'hello'},
      ]);
    });

    it('understands strings with numbers as strings', () => {
      const input = '"2"';
      expect(tokenize(input)).toEqual([{type: Type.String, value: '2'}]);
    });

    it('accepts quotes within strings', () => {
      const input = '2 + "he\'llo"';
      expect(tokenize(input)).toEqual([
        {type: Type.Number, value: '2'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.String, value: "he'llo"},
      ]);
    });

    it('accepts spaces within strings', () => {
      const input = '2 + "hello how are you?"';
      expect(tokenize(input)).toEqual([
        {type: Type.Number, value: '2'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.String, value: 'hello how are you?'},
      ]);
    });

    it('throws when it encounters an unclosed string', () => {
      const input = '2 + "hello';
      expect(() => tokenize(input)).toThrow(new Error('Unclosed string'));
    });
  });

  describe('booleans', () => {
    it('accepts booleans', () => {
      const input = '2 + true + false';
      expect(tokenize(input)).toEqual([
        {type: Type.Number, value: '2'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Boolean, value: 'true'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Boolean, value: 'false'},
      ]);
    });
  });

  describe('symbols', () => {
    it('accepts symbols at end of input', () => {
      const input = '"hello" + heyhey';
      expect(tokenize(input)).toEqual([
        {type: Type.String, value: 'hello'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Symbol, value: 'heyhey'},
      ]);
    });

    it('accepts symbols in middle of input', () => {
      const input = '"hello" + heyhey / 2';
      expect(tokenize(input)).toEqual([
        {type: Type.String, value: 'hello'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Symbol, value: 'heyhey'},
        {type: Type.MathOperation, value: '/'},
        {type: Type.Number, value: '2'},
      ]);
    });

    it('accepts capital letters', () => {
      const input = '"hello" + HeyHey / 2';
      expect(tokenize(input)).toEqual([
        {type: Type.String, value: 'hello'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Symbol, value: 'HeyHey'},
        {type: Type.MathOperation, value: '/'},
        {type: Type.Number, value: '2'},
      ]);
    });

    it('accepts underscores', () => {
      const input = '"hello" + Hey_Hey_ / 2';
      expect(tokenize(input)).toEqual([
        {type: Type.String, value: 'hello'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Symbol, value: 'Hey_Hey_'},
        {type: Type.MathOperation, value: '/'},
        {type: Type.Number, value: '2'},
      ]);
    });

    it('recognizes method names', () => {
      const input = 'print( x + 2 )';
      expect(tokenize(input)).toEqual([
        {type: Type.Symbol, value: 'print'},
        {type: Type.Special, value: '('},
        {type: Type.Symbol, value: 'x'},
        {type: Type.MathOperation, value: '+'},
        {type: Type.Number, value: '2'},
        {type: Type.Special, value: ')'},
      ]);
    });
  });

  describe('special characters', () => {
    it('accepts equal signs', () => {
      const input = 'magic_two = 2';
      expect(tokenize(input)).toEqual([
        {type: Type.Symbol, value: 'magic_two'},
        {type: Type.Special, value: '='},
        {type: Type.Number, value: '2'},
      ]);
    });

    it('accepts parentheses', () => {
      const input = '(2 * 2) / 4';
      expect(tokenize(input)).toEqual([
        {type: Type.Special, value: '('},
        {type: Type.Number, value: '2'},
        {type: Type.MathOperation, value: '*'},
        {type: Type.Number, value: '2'},
        {type: Type.Special, value: ')'},
        {type: Type.MathOperation, value: '/'},
        {type: Type.Number, value: '4'},
      ]);
    });

    it('accepts question marks and colons', () => {
      const input = 'true ? 24 : 42';
      expect(tokenize(input)).toEqual([
        {type: Type.Boolean, value: 'true'},
        {type: Type.Special, value: '?'},
        {type: Type.Number, value: '24'},
        {type: Type.Special, value: ':'},
        {type: Type.Number, value: '42'},
      ]);
    });

    it('accepts function assignments using brackets', () => {
      const input = 'multiply = {(x, y) x * y};';
      expect(tokenize(input)).toEqual([
        {type: Type.Symbol, value: 'multiply'},
        {type: Type.Special, value: '='},
        {type: Type.Special, value: '{'},
        {type: Type.Special, value: '('},
        {type: Type.Symbol, value: 'x'},
        {type: Type.Special, value: ','},
        {type: Type.Symbol, value: 'y'},
        {type: Type.Special, value: ')'},
        {type: Type.Symbol, value: 'x'},
        {type: Type.MathOperation, value: '*'},
        {type: Type.Symbol, value: 'y'},
        {type: Type.Special, value: '}'},
        {type: Type.Special, value: ';'},
      ]);
    });

    it('accepts function calls', () => {
      const input = 'multiply(x, y)';
      expect(tokenize(input)).toEqual([
        {type: Type.Symbol, value: 'multiply'},
        {type: Type.Special, value: '('},
        {type: Type.Symbol, value: 'x'},
        {type: Type.Special, value: ','},
        {type: Type.Symbol, value: 'y'},
        {type: Type.Special, value: ')'},
      ]);
    });
  });

  describe('whitespace', () => {
    it('removes whitespace', () => {
      const input = `
        base = 5;
        calc = {(x)
          double = {() x * base};
          double();
        };
        calc(2);
      `;
      expect(tokenize(input)).toEqual([
        {type: Type.Symbol, value: 'base'},
        {type: Type.Special, value: '='},
        {type: Type.Number, value: '5'},
        {type: Type.Special, value: ';'},
        {type: Type.Symbol, value: 'calc'},
        {type: Type.Special, value: '='},
        {type: Type.Special, value: '{'},
        {type: Type.Special, value: '('},
        {type: Type.Symbol, value: 'x'},
        {type: Type.Special, value: ')'},
        {type: Type.Symbol, value: 'double'},
        {type: Type.Special, value: '='},
        {type: Type.Special, value: '{'},
        {type: Type.Special, value: '('},
        {type: Type.Special, value: ')'},
        {type: Type.Symbol, value: 'x'},
        {type: Type.MathOperation, value: '*'},
        {type: Type.Symbol, value: 'base'},
        {type: Type.Special, value: '}'},
        {type: Type.Special, value: ';'},
        {type: Type.Symbol, value: 'double'},
        {type: Type.Special, value: '('},
        {type: Type.Special, value: ')'},
        {type: Type.Special, value: ';'},
        {type: Type.Special, value: '}'},
        {type: Type.Special, value: ';'},
        {type: Type.Symbol, value: 'calc'},
        {type: Type.Special, value: '('},
        {type: Type.Number, value: '2'},
        {type: Type.Special, value: ')'},
        {type: Type.Special, value: ';'},
      ]);
    });
  });
});
