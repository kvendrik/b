import Interpreter, {ObfuscatedValue} from '../Interpreter';
import {toAST, TokenType} from '../../parser';

describe('Interpreter()', () => {
  describe('operations', () => {
    it('understands basic math operations', () => {
      const ast = toAST(`2 * 2`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '4'});
    });

    it('understands symbols in operations', () => {
      const ast = toAST(`count = 2; 2 * count`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '4'});
    });

    // TODO
    it.skip('understands basic math order', () => {
      const ast = toAST(`2 + 2 * 4`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '10'});
    });
  });

  describe('variables', () => {
    it('understands variable declarations', () => {
      const ast = toAST(`count = 2; count`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '2'});
    });

    it('understands variable declarations using function calls', () => {
      const ast = toAST(`sum = {() 2 * 2}; count = sum(); count`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '4'});
    });
  });

  describe('functions', () => {
    it('understands function declarations', () => {
      const ast = toAST(`sum = {(x, y) x * y}; sum`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({
        type: TokenType.String,
        value: ObfuscatedValue.Function,
      });
    });

    it('understands function calls', () => {
      const ast = toAST(`sum = {() 2 * 2}; sum()`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '4'});
    });

    it('understands function calls with arguments', () => {
      const ast = toAST(`sum = {(x, y) x * y}; sum(2, 2)`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '4'});
    });

    it('understands symbols as arguments', () => {
      const ast = toAST(`count = 2; sum = {(x, y) x * y}; sum(2, count)`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '4'});
    });

    it('understands symbols derived from calls as arguments', () => {
      const ast = toAST(
        `sum = {() 2 * 2}; count = sum(); double = {(x) x * 2}; double(count)`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '8'});
    });

    it.skip('understands function calls as arguments', () => {
      const ast = toAST(`add = {() 2 + 2}; sum = {(x) x * 2}; sum(add())`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '8'});
    });

    it('keeps previously defined variables accessible', () => {
      const ast = toAST(`
        count = 2;
        add = {(x)
          x + count
        };
        add(2);
      `);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '4'});
    });

    it('allows for multiline function bodies', () => {
      const ast = toAST(`
        add = {(x)
          second_count = 5;
          x + second_count
        };
        add(2);
      `);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '7'});
    });

    it('scopes variables to deepest function', () => {
      const ast = toAST(`
        add = {()
          count = 2
          2 * count
        };
        count
      `);
      const interpreter = new Interpreter();
      expect(() => interpreter.evaluate(ast)).toThrow(
        new Error('count is not defined.'),
      );
    });

    it('overwrites variables when nested variable is created with same name', () => {
      const ast = toAST(`
        count = 5;
        add = {()
          count = 2;
          2 * count
        };
        add();
      `);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '4'});
    });

    it('supports nested function calls', () => {
      const ast = toAST(`
        multiply = {(x, y) x * y};
        calc = {()
          count = 2;
          second_count = 4;
          multiply(count, second_count);
        };
        calc();
      `);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '8'});
    });

    it.skip('supports nested functions', () => {
      const ast = toAST(`
        calc = {()
          double = {() 2 * 2};
          double();
        }
        calc();
      `);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual({type: TokenType.Number, value: '4'});
    });
  });

  describe('builtIns', () => {
    describe('concat()', () => {
      it('concatenates multiple strings', () => {
        const ast = toAST('concat("Hello", "there!");');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(result).toEqual({type: TokenType.String, value: 'Hello there!'});
      });
    });

    describe('log()', () => {
      it('calls console.log', () => {
        const logSpy = jest.spyOn(console, 'log');
        logSpy.mockReset();
        const ast = toAST('log("Hello", "there!");');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(logSpy).toHaveBeenCalledWith('Hello', 'there!');
        expect(result).toBe(undefined);
        logSpy.mockRestore();
      });
    });
  });
});
