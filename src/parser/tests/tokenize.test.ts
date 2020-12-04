import tokenize from '../tokenize';

describe('tokenize()', () => {
  describe('operations', () => {
    it('accepts basic operations', () => {
      const input = '2 + 4';
      expect(tokenize(input)).toEqual([
        {type: 'number', value: '2'},
        {type: 'operation', value: '+'},
        {type: 'number', value: '4'},
      ]);
    });

    it('accepts advanced operations', () => {
      const input = '2 / 2 * 42 + 728';
      expect(tokenize(input)).toEqual([
        {type: 'number', value: '2'},
        {type: 'operation', value: '/'},
        {type: 'number', value: '2'},
        {type: 'operation', value: '*'},
        {type: 'number', value: '42'},
        {type: 'operation', value: '+'},
        {type: 'number', value: '728'},
      ]);
    });
  });

  describe('numbers', () => {
    it('accepts big numbers', () => {
      const input = '2 + 452';
      expect(tokenize(input)).toEqual([
        {type: 'number', value: '2'},
        {type: 'operation', value: '+'},
        {type: 'number', value: '452'},
      ]);
    });
  });

  describe('strings', () => {
    it('accepts strings', () => {
      const input = '2 + "hello"';
      expect(tokenize(input)).toEqual([
        {type: 'number', value: '2'},
        {type: 'operation', value: '+'},
        {type: 'string', value: 'hello'},
      ]);
    });

    it('accepts quotes within strings', () => {
      const input = '2 + "he\'llo"';
      expect(tokenize(input)).toEqual([
        {type: 'number', value: '2'},
        {type: 'operation', value: '+'},
        {type: 'string', value: "he'llo"},
      ]);
    });

    it('accepts spaces within strings', () => {
      const input = '2 + "hello how are you?"';
      expect(tokenize(input)).toEqual([
        {type: 'number', value: '2'},
        {type: 'operation', value: '+'},
        {type: 'string', value: 'hello how are you?'},
      ]);
    });

    it('throws when it encounters an unclosed string', () => {
      const input = '2 + "hello';
      expect(() => tokenize(input)).toThrow(new Error('Unclosed string'));
    });
  });

  describe('symbols', () => {
    it('accepts symbols at end of input', () => {
      const input = '"hello" + heyhey';
      expect(tokenize(input)).toEqual([
        {type: 'string', value: 'hello'},
        {type: 'operation', value: '+'},
        {type: 'symbol', value: 'heyhey'},
      ]);
    });

    it('accepts symbols in middle of input', () => {
      const input = '"hello" + heyhey / 2';
      expect(tokenize(input)).toEqual([
        {type: 'string', value: 'hello'},
        {type: 'operation', value: '+'},
        {type: 'symbol', value: 'heyhey'},
        {type: 'operation', value: '/'},
        {type: 'number', value: '2'},
      ]);
    });

    it('accepts capital letters', () => {
      const input = '"hello" + HeyHey / 2';
      expect(tokenize(input)).toEqual([
        {type: 'string', value: 'hello'},
        {type: 'operation', value: '+'},
        {type: 'symbol', value: 'HeyHey'},
        {type: 'operation', value: '/'},
        {type: 'number', value: '2'},
      ]);
    });

    it('accepts underscores', () => {
      const input = '"hello" + Hey_Hey_ / 2';
      expect(tokenize(input)).toEqual([
        {type: 'string', value: 'hello'},
        {type: 'operation', value: '+'},
        {type: 'symbol', value: 'Hey_Hey_'},
        {type: 'operation', value: '/'},
        {type: 'number', value: '2'},
      ]);
    });

    it('recognizes method names', () => {
      const input = 'print( x + 2 )';
      expect(tokenize(input)).toEqual([
        {type: 'symbol', value: 'print'},
        {type: 'special', value: '('},
        {type: 'symbol', value: 'x'},
        {type: 'operation', value: '+'},
        {type: 'number', value: '2'},
        {type: 'special', value: ')'},
      ]);
    });
  });

  describe('special characters', () => {
    it('accepts equal signs', () => {
      const input = 'magic_two = 2';
      expect(tokenize(input)).toEqual([
        {type: 'symbol', value: 'magic_two'},
        {type: 'special', value: '='},
        {type: 'number', value: '2'},
      ]);
    });

    it('accepts parentheses', () => {
      const input = '(2 * 2) / 4';
      expect(tokenize(input)).toEqual([
        {type: 'special', value: '('},
        {type: 'number', value: '2'},
        {type: 'operation', value: '*'},
        {type: 'number', value: '2'},
        {type: 'special', value: ')'},
        {type: 'operation', value: '/'},
        {type: 'number', value: '4'},
      ]);
    });

    it('accepts question marks and colons', () => {
      const input = 'true ? 24 : 42';
      expect(tokenize(input)).toEqual([
        {type: 'symbol', value: 'true'},
        {type: 'special', value: '?'},
        {type: 'number', value: '24'},
        {type: 'special', value: ':'},
        {type: 'number', value: '42'},
      ]);
    });

    it('accepts function assignments using brackets', () => {
      const input = 'multiply = {(x, y) x * y};';
      expect(tokenize(input)).toEqual([
        {type: 'symbol', value: 'multiply'},
        {type: 'special', value: '='},
        {type: 'special', value: '{'},
        {type: 'special', value: '('},
        {type: 'symbol', value: 'x'},
        {type: 'special', value: ','},
        {type: 'symbol', value: 'y'},
        {type: 'special', value: ')'},
        {type: 'symbol', value: 'x'},
        {type: 'operation', value: '*'},
        {type: 'symbol', value: 'y'},
        {type: 'special', value: '}'},
        {type: 'special', value: ';'},
      ]);
    });

    it('accepts function calls', () => {
      const input = 'multiply(x, y)';
      expect(tokenize(input)).toEqual([
        {type: 'symbol', value: 'multiply'},
        {type: 'special', value: '('},
        {type: 'symbol', value: 'x'},
        {type: 'special', value: ','},
        {type: 'symbol', value: 'y'},
        {type: 'special', value: ')'},
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
        {type: 'symbol', value: 'base'},
        {type: 'special', value: '='},
        {type: 'number', value: '5'},
        {type: 'special', value: ';'},
        {type: 'symbol', value: 'calc'},
        {type: 'special', value: '='},
        {type: 'special', value: '{'},
        {type: 'special', value: '('},
        {type: 'symbol', value: 'x'},
        {type: 'special', value: ')'},
        {type: 'symbol', value: 'double'},
        {type: 'special', value: '='},
        {type: 'special', value: '{'},
        {type: 'special', value: '('},
        {type: 'special', value: ')'},
        {type: 'symbol', value: 'x'},
        {type: 'operation', value: '*'},
        {type: 'symbol', value: 'base'},
        {type: 'special', value: '}'},
        {type: 'special', value: ';'},
        {type: 'symbol', value: 'double'},
        {type: 'special', value: '('},
        {type: 'special', value: ')'},
        {type: 'special', value: ';'},
        {type: 'special', value: '}'},
        {type: 'special', value: ';'},
        {type: 'symbol', value: 'calc'},
        {type: 'special', value: '('},
        {type: 'number', value: '2'},
        {type: 'special', value: ')'},
        {type: 'special', value: ';'},
      ]);
    });
  });
});
