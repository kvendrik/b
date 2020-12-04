import Interpreter, {ObfuscatedValue} from '../Interpreter';
import {toAST} from '../../parser';

describe('Interpreter()', () => {
  describe('operations', () => {
    it('understands basic math operations', () => {
      const ast = toAST(`2 * 2`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe('4');
    });

    it('understands symbols in operations', () => {
      const ast = toAST(`count = 2; 2 * count`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe('4');
    });

    // TODO
    it.skip('understands basic math order', () => {
      const ast = toAST(`2 + 2 * 4`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe('10');
    });
  });

  describe('variables', () => {
    it('understands variable declarations', () => {
      const expectedValue = '2';
      const ast = toAST(`count = ${expectedValue}; count`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe(expectedValue);
    });
  });

  describe('functions', () => {
    it('understands function declarations', () => {
      const ast = toAST(`sum = {(x, y) x * y}; sum`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe(ObfuscatedValue.Function);
    });

    it('understands function calls', () => {
      const ast = toAST(`sum = {() 2 * 2}; sum()`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe('4');
    });

    it('understands function calls with arguments', () => {
      const ast = toAST(`sum = {(x, y) x * y}; sum(2, 2)`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe('4');
    });

    it('understands symbols in calls', () => {
      const ast = toAST(`count = 2; sum = {(x, y) x * y}; sum(2, count)`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe('4');
    });
  });
});
