#!/usr/bin/env node

const readline = require('readline');
const {existsSync, readFileSync} = require('fs');
const {version} = require('./package.json');
const {toAST, Interpreter} = require('.');

const interpreter = new Interpreter();

const astMode = process.argv.some((arg) => arg === '--ast' || arg === '-a');
const interactiveMode = process.argv.some((arg) => arg === '--interactive' || arg === '-i');
const showVersion = process.argv.some((arg) => arg === '--version' || arg === '-v');
const [,, inputFilePath] = process.argv.filter((arg) => !arg.startsWith('-'));

if (showVersion) {
  console.log(version);
  process.exit();
}

if (inputFilePath) {
  if (!existsSync(inputFilePath)) throw new Error(`${inputFilePath} does not exist.`);
  evaluateProgram(readFileSync(inputFilePath, 'utf-8'));
  if (!interactiveMode) process.exit();
}

startInteractiveMode();

function startInteractiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(version);
  nextPrompt();

  function nextPrompt() {
    rl.question('>>> ', (commandOrProgram) => {
      if (commandOrProgram === 'exit') process.exit();

      const resultExpression = evaluateProgram(commandOrProgram);
      if (resultExpression) console.log(Interpreter.toSingleToken(resultExpression).value);

      nextPrompt();
    });
  }
}

function evaluateProgram(program) {
  const ast = toAST(program);
  if (astMode) console.log(JSON.stringify(ast, null, 2));
  return interpreter.evaluate(ast);
}
