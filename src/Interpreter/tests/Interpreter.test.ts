import Interpreter, {ObfuscatedValue, tokenToExpression} from '../Interpreter';
import {toAST, TokenType, BooleanValue} from '../../parser';

describe('Interpreter()', () => {
  describe('operations', () => {
    it('understands basic math operations', () => {
      const ast = toAST(`2 * 2`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '4'}),
      );
    });

    it('understands symbols in operations', () => {
      const ast = toAST(`count = 2; 2 * count`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '4'}),
      );
    });

    // TODO
    it.skip('understands basic math order', () => {
      const ast = toAST(`2 + 2 * 4`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '10'}),
      );
    });

    it('understands remainder operations', () => {
      const ast = toAST(`10 % 5`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '0'}),
      );
    });
  });

  describe('variables', () => {
    it('understands variable declarations', () => {
      const ast = toAST(`count = 2; count`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '2'}),
      );
    });

    it('understands variable declarations using function calls', () => {
      const ast = toAST(`sum = {() 2 * 2}; count = sum(); count`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '4'}),
      );
    });

    it('understands variable declarations using member expressions', () => {
      const ast = toAST(`data = {"0": "dog"}; animal = data["0"]; animal`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.String, value: 'dog'}),
      );
    });

    it('understands variable declarations using member expressions on both sides', () => {
      const ast = toAST(
        `data = {"0": "dog"}; words = {"0": "dogs are great"}; data["0"] = words["0"]; data["0"]`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.String, value: 'dogs are great'}),
      );
    });

    it('understands member expressions on variables', () => {
      const ast = toAST(
        `regions = {"0": {"NL": "20m"}}; first = regions["0"]; first["NL"]`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.String, value: '20m'}),
      );
    });
  });

  describe('functions', () => {
    it('understands function literals', () => {
      const ast = toAST(`{(x, y) x * y}`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(ast[0]);
    });

    it('understands function declarations', () => {
      const [functionAST] = toAST('{(x, y) x * y}');
      const ast = toAST(`sum = {(x, y) x * y}; sum`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(functionAST);
    });

    it('understands function calls', () => {
      const ast = toAST(`sum = {() 2 * 2}; sum()`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '4'}),
      );
    });

    it('understands function calls with arguments', () => {
      const ast = toAST(`sum = {(x, y) x * y}; sum(2, 2)`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '4'}),
      );
    });

    it('understands symbols as arguments', () => {
      const ast = toAST(`count = 2; sum = {(x, y) x * y}; sum(2, count)`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '4'}),
      );
    });

    it('understands symbols derived from calls as arguments', () => {
      const ast = toAST(
        `sum = {() 2 * 2}; count = sum(); double = {(x) x * 2}; double(count)`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '8'}),
      );
    });

    it('understands function calls as arguments', () => {
      const ast = toAST(`add = {() 2 + 2}; sum = {(x) x * 2}; sum(add())`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '8'}),
      );
    });

    it('understands tests as arguments', () => {
      const ast = toAST(`add = {(x) x}; add(2 > 1)`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.Boolean,
          value: BooleanValue.True,
        }),
      );
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
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '4'}),
      );
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
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '7'}),
      );
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
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '4'}),
      );
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
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '8'}),
      );
    });

    it('supports nested functions', () => {
      const ast = toAST(`
        calc = {()
          double = {() 2 * 2};
          double();
        };
        calc();
      `);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.Number, value: '4'}),
      );
    });

    it('understands returning literals', () => {
      const ast = toAST(`
        say = {() "Hello!"};
        say();
      `);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.String, value: 'Hello!'}),
      );
    });

    it('understands returning dictionaries', () => {
      const ast = toAST(`
        get_data = {() {"0": "dog"}};
        result = get_data();
        result["0"]
      `);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.String, value: 'dog'}),
      );
    });

    it('understands breaks', () => {
      const ast = toAST(`
        say = {() break; "Hello!"};
        say();
      `);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBeUndefined();
    });
  });

  describe('literals', () => {
    it('understands returning literals', () => {
      const ast = toAST(`"Hello!"`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({type: TokenType.String, value: 'Hello!'}),
      );
    });
  });

  describe('tests', () => {
    it('understands bigger than tests', () => {
      const ast = toAST(`2 > 1`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.Boolean,
          value: BooleanValue.True,
        }),
      );
    });

    it('understands smaller than tests', () => {
      const ast = toAST(`count = 2; count < 10`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.Boolean,
          value: BooleanValue.True,
        }),
      );
    });

    it('understands equality checks', () => {
      const ast = toAST(`"Hello!" == "ello!"`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.Boolean,
          value: BooleanValue.False,
        }),
      );
    });

    it('understands negative equality checks', () => {
      const ast = toAST(`"Hello!" != "ello!"`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.Boolean,
          value: BooleanValue.True,
        }),
      );
    });

    it('understands member expressions', () => {
      const ast = toAST(`animals = {"0": "dog"}; animals["0"] == "dog"`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.Boolean,
          value: BooleanValue.True,
        }),
      );
    });
  });

  describe('dictionaries', () => {
    it('understands dictionary literals', () => {
      const ast = toAST(`{"animal": "cat"}`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(ast[0]);
    });

    it('understands dictionary assignments', () => {
      const [dictionaryAST] = toAST('{"animal": "cat"}');
      const ast = toAST(`data = {"animal": "cat"}; data`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(dictionaryAST);
    });

    it('understands dictionary member expressions', () => {
      const ast = toAST(
        `program = {
          "data": {
            "countries_1": {
              "CA": {
                "population": "40m"
              },
              "NL": {
                "population": "20m"
              }
            }
          }
        };
        program["data"]["countries_1"]["CA"]["population"]`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.String,
          value: '40m',
        }),
      );
    });

    it('understands dictionary member expressions that return a dictionary', () => {
      const [expectedAST] = toAST('{"population": "40m"}');
      const ast = toAST(
        `program = {
          "data": {
            "countries_1": {
              "CA": {
                "population": "40m"
              },
              "NL": {
                "population": "20m"
              }
            }
          }
        };
        program["data"]["countries_1"]["CA"]`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(expectedAST);
    });

    it('understands dictionary member expressions with symbols', () => {
      const ast = toAST(
        `index = "1"; data = {"animals": {"0": "cat", "1": "dog"}}; data["animals"][index]`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.String,
          value: 'dog',
        }),
      );
    });

    it('understands dictionary member expressions with function calls', () => {
      const ast = toAST(
        `first = "1"; second = "2"; data = {"animals": {"0": "cat", "12": "dog"}}; data["animals"][concat(first, second)]`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.String,
          value: 'dog',
        }),
      );
    });

    it('understands assignments using member expressions', () => {
      const ast = toAST(
        `data = {"animals": {"0": "cat", "1": "dog"}}; data["animals"]["1"] = "raccoon"; data["animals"]["1"]`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.String,
          value: 'raccoon',
        }),
      );
    });

    it('understands assignments using member expressions to new keys', () => {
      const ast = toAST(
        `data = {"animals": {"0": "cat", "1": "dog"}}; data["animals"]["2"] = "raccoon"; data["animals"]["2"]`,
      );
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual(
        tokenToExpression({
          type: TokenType.String,
          value: 'raccoon',
        }),
      );
    });
  });

  describe('toSingleToken()', () => {
    it('reduces token expression to single token', () => {
      const ast = toAST(`"Hello!"`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result && Interpreter.toSingleToken(result)).toEqual({
        type: TokenType.String,
        value: 'Hello!',
      });
    });

    it('obfuscates functions', () => {
      const ast = toAST(`{() "Hello!"}`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result && Interpreter.toSingleToken(result)).toEqual({
        type: TokenType.String,
        value: ObfuscatedValue.Function,
      });
    });

    it('obfuscates dictionaries', () => {
      const ast = toAST(`{"greeting": "Hello!"}`);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result && Interpreter.toSingleToken(result)).toEqual({
        type: TokenType.String,
        value: ObfuscatedValue.Dictionary,
      });
    });
  });

  describe('builtIns', () => {
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

    describe('if()', () => {
      it('returns given function return value if test passes', () => {
        const ast = toAST('if(2 > 1, {() "Hello!"});');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(result).toEqual(
          tokenToExpression({type: TokenType.String, value: 'Hello!'}),
        );
      });

      it('doesn’t return given value if test doesn’t pass', () => {
        const ast = toAST('if(1 > 2, {() "Hello!"});');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(result).toBeUndefined();
      });

      it('returns alternate value if test doesn’t pass', () => {
        const ast = toAST('if(1 > 2, {() "Hello!"}, {() "Hi!"});');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(result).toEqual(
          tokenToExpression({type: TokenType.String, value: 'Hi!'}),
        );
      });

      it('callback doesn’t execute if condition isn’t true', () => {
        const logSpy = jest.spyOn(console, 'log');
        logSpy.mockReset();

        const ast = toAST('if(1 > 2, {() log()});');

        const interpreter = new Interpreter();
        interpreter.evaluate(ast);

        expect(logSpy).not.toHaveBeenCalled();
        logSpy.mockRestore();
      });
    });

    describe('defined()', () => {
      it('returns boolean true if given symbol is defined', () => {
        const ast = toAST('greeting = "hello"; defined(greeting)');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(result).toEqual(
          tokenToExpression({
            type: TokenType.Boolean,
            value: BooleanValue.True,
          }),
        );
      });

      it('returns boolean false if given symbol is undefined', () => {
        const ast = toAST('defined(greeting)');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(result).toEqual(
          tokenToExpression({
            type: TokenType.Boolean,
            value: BooleanValue.False,
          }),
        );
      });

      it('returns boolean true if given member expression is defined', () => {
        const ast = toAST('data = {"0": "cat"}; defined(data["0"])');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(result).toEqual(
          tokenToExpression({
            type: TokenType.Boolean,
            value: BooleanValue.True,
          }),
        );
      });

      it('returns boolean false if given member expression is undefined', () => {
        const ast = toAST('data = {"0": "cat"}; defined(data["1"])');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(result).toEqual(
          tokenToExpression({
            type: TokenType.Boolean,
            value: BooleanValue.False,
          }),
        );
      });

      it('throws error if given value is not a symbol or member expression', () => {
        const ast = toAST('defined({() "Hi!"})');
        const interpreter = new Interpreter();
        expect(() => interpreter.evaluate(ast)).toThrow(
          new Error(
            'Assignment left hand can only be a member expression or symbol.',
          ),
        );
      });
    });

    describe('while()', () => {
      it('loops as long as condition is true', () => {
        const logSpy = jest.spyOn(console, 'log');
        logSpy.mockReset();

        const ast = toAST('i = 0; while(i < 10, {() i = i + 1; log(i)});');

        const interpreter = new Interpreter();
        interpreter.evaluate(ast);

        expect(logSpy).toHaveBeenCalledTimes(10);
        logSpy.mockRestore();
      });

      it('understands if statements', () => {
        const logSpy = jest.spyOn(console, 'log');
        logSpy.mockReset();

        const ast = toAST(
          'i = 0; while(i < 10, {() i = i + 1; if(i == 5, log("Done!"))});',
        );

        const interpreter = new Interpreter();
        interpreter.evaluate(ast);

        expect(logSpy).toHaveBeenCalledWith('Done!');
        logSpy.mockRestore();
      });
    });

    describe('concat()', () => {
      it('concatenates multiple strings', () => {
        const ast = toAST('concat("Hello ", "there!");');
        const interpreter = new Interpreter();
        const result = interpreter.evaluate(ast);
        expect(result).toEqual(
          tokenToExpression({type: TokenType.String, value: 'Hello there!'}),
        );
      });
    });
  });
});
