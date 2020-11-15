import lexer from "./lexer";

describe("lexer", () => {
  describe("operations", () => {
    it("accepts basic operations", () => {
      const input = "2 + 4";
      expect(lexer(input)).toEqual([
        { type: "number", value: "2" },
        { type: "operation", value: "+" },
        { type: "number", value: "4" },
      ]);
    });

    it("accepts advanced operations", () => {
      const input = "2 / 2 * 42 + 728";
      expect(lexer(input)).toEqual([
        { type: "number", value: "2" },
        { type: "operation", value: "/" },
        { type: "number", value: "2" },
        { type: "operation", value: "*" },
        { type: "number", value: "42" },
        { type: "operation", value: "+" },
        { type: "number", value: "728" },
      ]);
    });
  });

  describe("numbers", () => {
    it("accepts big numbers", () => {
      const input = "2 + 452";
      expect(lexer(input)).toEqual([
        { type: "number", value: "2" },
        { type: "operation", value: "+" },
        { type: "number", value: "452" },
      ]);
    });
  });

  describe("strings", () => {
    it("accepts strings", () => {
      const input = '2 + "hello"';
      expect(lexer(input)).toEqual([
        { type: "number", value: "2" },
        { type: "operation", value: "+" },
        { type: "string", value: "hello" },
      ]);
    });

    it("accepts quotes within strings", () => {
      const input = '2 + "he\'llo"';
      expect(lexer(input)).toEqual([
        { type: "number", value: "2" },
        { type: "operation", value: "+" },
        { type: "string", value: "he'llo" },
      ]);
    });

    it("accepts spaces within strings", () => {
      const input = '2 + "hello how are you?"';
      expect(lexer(input)).toEqual([
        { type: "number", value: "2" },
        { type: "operation", value: "+" },
        { type: "string", value: "hello how are you?" },
      ]);
    });

    it("throws when it encounters an unclosed string", () => {
      const input = '2 + "hello';
      expect(() => lexer(input)).toThrow(new Error("Unclosed string"));
    });
  });

  describe("symbols", () => {
    it("accepts symbols at end of input", () => {
      const input = '"hello" + heyhey';
      expect(lexer(input)).toEqual([
        { type: "string", value: "hello" },
        { type: "operation", value: "+" },
        { type: "symbol", value: "heyhey" },
      ]);
    });

    it("accepts symbols in middle of input", () => {
      const input = '"hello" + heyhey / 2';
      expect(lexer(input)).toEqual([
        { type: "string", value: "hello" },
        { type: "operation", value: "+" },
        { type: "symbol", value: "heyhey" },
        { type: "operation", value: "/" },
        { type: "number", value: "2" },
      ]);
    });

    it("accepts capital letters", () => {
      const input = '"hello" + HeyHey / 2';
      expect(lexer(input)).toEqual([
        { type: "string", value: "hello" },
        { type: "operation", value: "+" },
        { type: "symbol", value: "HeyHey" },
        { type: "operation", value: "/" },
        { type: "number", value: "2" },
      ]);
    });

    it("accepts underscores", () => {
      const input = '"hello" + Hey_Hey_ / 2';
      expect(lexer(input)).toEqual([
        { type: "string", value: "hello" },
        { type: "operation", value: "+" },
        { type: "symbol", value: "Hey_Hey_" },
        { type: "operation", value: "/" },
        { type: "number", value: "2" },
      ]);
    });

    it("recognizes method names", () => {
      const input = 'print( x + 2 )';
      expect(lexer(input)).toEqual([
        { type: "symbol", value: "print" },
        { type: "special", value: "(" },
        { type: "symbol", value: "x" },
        { type: "operation", value: "+" },
        { type: "number", value: "2" },
        { type: "special", value: ")" },
      ]);
    });
  });

  describe("special characters", () => {
    it("accepts equal signs", () => {
      const input = "magic_two = 2";
      expect(lexer(input)).toEqual([
        { type: "symbol", value: "magic_two" },
        { type: "special", value: "=" },
        { type: "number", value: "2" },
      ]);
    });

    it("accepts parentheses", () => {
      const input = "(2 * 2) / 4";
      expect(lexer(input)).toEqual([
        { type: "special", value: "(" },
        { type: "number", value: "2" },
        { type: "operation", value: "*" },
        { type: "number", value: "2" },
        { type: "special", value: ")" },
        { type: "operation", value: "/" },
        { type: "number", value: "4" },
      ]);
    });

    it("accepts question marks and colons", () => {
      const input = "true ? 24 : 42";
      expect(lexer(input)).toEqual([
        { type: "symbol", value: "true" },
        { type: "special", value: "?" },
        { type: "number", value: "24" },
        { type: "special", value: ":" },
        { type: "number", value: "42" },
      ]);
    });
  });
});
