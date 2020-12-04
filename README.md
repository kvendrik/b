# B

👩‍💻 A very simple programming language. Created for practise purposes.

![](demo.gif)

## Interactive Mode

The interpreter CLI ships with an interactive mode that can be used to play around with the language:

```
git clone git@github.com:kvendrik/b.git && cd b && yarn && yarn build

./b
v1.0.0-alpha
>>> count = 2;
>>> multiply = {(x, y) x * y};
>>> multiply(count, 2);
4
>>> exit
```

## Why

I created this for practise purposes. I wanted to learn more about the inner workings of lexers, parsers, and interpreters. It seems like a good way to do so was by writing my own.

It's all written in JS which, depending on what it's used for, might not be what I would write this in if used in a production scenario, but it works well for practise purposes.

## Features

- [x] Basic math operations
- [x] String & Number literals
- [x] Variable assignments
- [x] Function expressions & assignments
- [x] Function calls
- [ ] Line and character numbers in error messages
- [ ] Chained math operations (not implemented in interpreter yet e.g. `2 + 2 * 4 / 2`)
- [ ] Priority groups (e.g. `(2 + 2) * 2`)
- [ ] Conditional logic
- [ ] Loops
