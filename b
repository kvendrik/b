#!/usr/bin/env node

const readline = require('readline');
const {version} = require('./package.json');
const {toAST, Interpreter} = require('.');

const interpreter = new Interpreter();
const astMode = process.argv.some((arg) => arg === '--ast');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(version);
nextPrompt();

function nextPrompt() {
  rl.question('>>> ', (commandOrProgram) => {
    if (commandOrProgram === 'exit') process.exit();

    const ast = toAST(commandOrProgram);
    if (astMode) console.log(JSON.stringify(ast, null, 2));

    const result = interpreter.evaluate(ast);

    if (result) console.log(result);
    nextPrompt();
  });
}
