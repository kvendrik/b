# B

A very simple programming language that I created for practise purposes.

```
count = 2;
multiply = {(x, y) x * y};
multiply(count, 2);
```

## Interpreter

The interpreter ships with an interactive mode that can be used to play around with the language:

```
./b
>>> count = 2;
>>> multiply = {(x, y) x * y};
>>> multiply(count, 2);
4
>>> exit
```

## Why

I created this for practise purposes. I wanted to learn more about the inner workings of lexers, parsers, and interpreters, and felt like a good way to do so was by writing my own. It's all written in JS which might not be the most performant way of doing this. In a scenario where this would be used in the real would it could easily be rewritten in a language that is more suitable for it's purpose.
