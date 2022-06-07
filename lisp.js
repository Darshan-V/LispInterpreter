const readline = require('readline')
let result
const numberParser = input => (result = input.match(/^-?(0|([1-9][0-9]*))(\.[0-9]+)?([E][+-]?[0-9]+)?/i)) && [result[0] * 1, input.slice(result[0].length)]
const spaceParser = input => input.replace(/^\s+/, '')
const symbolParser = (input) => {
  result = input.match(/^(([a-zA-Z_]+)|(\+|-|>=|<=|>|<|=|\*|\\))/)
  if (!result) return null
  return [result[0], input.slice(result[0].length)]
}

const globalEnv = {
  '+': (args) => args.reduce((a, b) => a + b),
  '-': (args) => args.reduce((a, b) => a - b),
  '/': (args) => args.reduce((a, b) => a / b),
  '*': (args) => args.reduce((a, b) => a * b),
  '<': (arr) => arr[0] < arr[1],
  '>': (arr) => arr[0] > arr[1],
  '>=': (arr) => arr[0] >= arr[1],
  '<=': (arr) => arr[0] <= arr[1],
  '=': (arr) => arr[0] === arr[1],
  pi: Math.PI,
  sqrt: (input) => Math.sqrt(input),
  "equal?": (arr) => arr[0] === arr[1],
  pow: (arr) => Math.pow(arr[0], arr[1]),
  car: (arr) => arr[0],
  cdr: (arr) => arr.slice(1),
  print: (input) => console.log(input[0]),
  map: (mapper, arr) => arr.map(mapper),
  cosn: (car, cdr) => [car, cdr],
  list: (...input) => input
}

const ifParser = (input, env = globalEnv) => {
  if (!input.startsWith('if')) return null
  let result
  input = spaceParser(input.slice(2))
  result = sExpressionParser(input, env)
  if (!result) return null
  const condition = result[0]
  input = spaceParser(result[1])
  if (condition) {
    result = expressionParserEval(input, env)
    if (!result) return null
    input = parseCode(result[1])[1]
    if (!input) return null
    input = spaceParser(input)
    if (input[0] !== ')') return null
    return [result[0], input.slice(1)]
  }
  input = parseCode(result[1])[1]
  result = expressionParserEval(input, env)
  if (!result) return null
  input = spaceParser(result[1])
  if (spaceParser(input) !== ')') return null
  return [result[0], input.slice(1)]
}

const quoteParser = input => {
  let result
  if (!input.startsWith('quote')) return null
  input = input.slice(5)
  input = spaceParser(input)
  if (input[0] !== '(') {
    result = ''
    while (input[0] !== ')') {
      result = result + input[0]
      input = input.slice(1)
    }
    return [result, input.slice(1)]
  }
  result = parseCode(input)
  if (!result) return null
  input = spaceParser(result[1])
  if (input[0] !== ')') return null
  return [result[0], result[1].slice(1)]
}

const lambdaParser = input => {
  let result
  if (!input.startsWith('lambda')) return null
  input = input.slice(6)
  input = spaceParser(input)
  if (input[0] !== '(') return null
  input = spaceParser(input.slice(1))
  const localEnv = {}
  const args = {}
  while (input[0] !== ')') {
    result = symbolParser(input)
    if (!result) return null
    args[result[0]] = null
    input = spaceParser(result[1])
  }
  input = input.slice(1)
  localEnv.args = args
  localEnv.parent = globalEnv
  localEnv.argsCallStack = []
  result = parseCode(input)
  if (!result) return null
  localEnv.body = result[0]
  input = spaceParser(result[1])
  if (input[0] !== ')') return null
  return [localEnv, input.slice(1)]
}

const defineParser = input => {
  if (!input.startsWith('define')) return null
  input = input.slice(6)
  input = spaceParser(input)
  const result = symbolParser(input)
  if (!result) return null
  const identifier = result[0]
  const value = expressionParserEval(result[1])
  if (!value) return null
  input = spaceParser(value[1])
  if (input[0] !== ')') return null
  globalEnv[identifier] = value[0]
  return [identifier, spaceParser(value[1]).slice(1)]
}

const beginParser = (input, env) => {
  if (!input.startsWith('begin')) return null
  input = input.slice(5)
  while (input[0] !== ')') {
    result = expressionParserEval(input, env)
    input = spaceParser(result[1])
  }
  return [result[0], input.slice(1)]
}

const updateLambdaArgs = (func, input, env) => {
  let expressionResult; const funcKeys = Object.keys(globalEnv[func].args)
  let index = 0

  while (input[0] !== ')') {
    expressionResult = expressionParserEval(input, env)
    if (!expressionResult) return null
    globalEnv[func].args[funcKeys[index]] = expressionResult[0]
    index++
    input = spaceParser(expressionResult[1])
  }

  globalEnv[func].args.__func__ = globalEnv[func]
  globalEnv[func].argsCallStack.push(Object.assign({}, globalEnv[func].args))
  input = input.slice(1)
  const result = [lambdaEval(func), input]
  globalEnv[func].argsCallStack.pop()

  return result
}

const lambdaEval = (func) => {
  const callStackLastItemIndex = globalEnv[func].argsCallStack.length - 1
  const result = expressionParserEval(globalEnv[func].body, globalEnv[func].argsCallStack[callStackLastItemIndex])
  return result[0]
}

const globalEnvParser = (input, env) => {
  const args = []
  const firstEmptyspaceIndex = input.indexOf(' ')
  const textChar = input.slice(0, firstEmptyspaceIndex)
  if (!globalEnv[textChar]) return null
  if (typeof globalEnv[textChar] === 'object') {
    input = spaceParser(input.slice(firstEmptyspaceIndex))
    result = updateLambdaArgs(textChar, input, env)
    return result
  }
  const operation = textChar
  input = spaceParser(input.slice(firstEmptyspaceIndex))
  while (input[0] !== ')') {
    result = expressionParserEval(input, env)
    if (!result) return null
    args.push(result[0])
    input = spaceParser(result[1])
  }
  return [globalEnv[operation](args), input.slice(1)]
}

const sExpressionParser = (input, env = globalEnv) => {
  let result
  if (input[0] !== '(') return null
  input = spaceParser(input.slice(1))
  const parsers = [defineParser, beginParser, ifParser, quoteParser, lambdaParser, globalEnvParser]
  for (const parser of parsers) {
    result = parser(input, env)
    if (result) return result
  }
  return null
}

const parseCode = input => {
  let result
  input = spaceParser(input)
  if ((result = numberParser(input))) return [result[0], result[1]]
  else if ((result = symbolParser(input))) return [result[0], result[1]]
  if (input[0] === '(') {
    result = '('
    let count = 1
    input = input.slice(1)
    while (count >= 0) {
      if (input[0] === '(') count++
      if (input[0] === ')') count--
      if (count === 0) {
        result = result + ')'
        input = input.slice(1)
        input = spaceParser(input)
        return [result, input]
      }
      result = result + input[0]
      input = input.slice(1)
    }
  }

  return null
}

const expressionParserEval = (input, env = globalEnv) => {
  input = spaceParser(input)
  if ((result = sExpressionParser(input, env))) return [result[0], result[1]]
  if ((result = numberParser(input))) return [result[0], result[1]]
  if ((result = symbolParser(input))) {
    if (!env[result[0]] && env.__func__ && env.__func__.parent[result[0]] !== undefined) {
      return [env.__func__.parent[result[0]], result[1]]
    }
    if (!env[result[0]] && !env.__func__) return null
    return [env[result[0]], result[1]]
  }
  return null
}

const rl = readline.createInterface(process.stdin, process.stdout)
rl.setPrompt('lispy> ')
rl.prompt()
rl.on('line', function(line) {
  if (line === 'quit') rl.close()
  console.log(expressionParserEval(line))
  rl.prompt()
}).on('close', function() {
  process.exit(0)
})

// console.log(expressionParserEval('(* pi 56 72)'))
// console.log(expressionParserEval('(begin (* 86 76) (* 65 45) (define twice (lambda (x) (* 2 x) ) ) (twice (+ 78 9) ) )'))
// console.log(expressionParserEval('(/ 90 0)'))

// console.log(expressionParserEval('(+ 45 67 (+ 1 1))'))
// console.log(expressionParserEval('(define define 90)'))
// console.log(expressionParserEval('(define define 90)'))
// console.log(expressionParserEval('(+ define 40)'))
// console.log(expressionParserEval('(define define define)'))
// console.log(expressionParserEval('(* (+ r define) 78  67)'))
// console.log(expressionParserEval('define'))

// console.log(expressionParserEval('(define oops 50)'))
// console.log(expressionParserEval('(plus 30 (plus 5 6))'))

// console.log(expressionParserEval('( if (> 30 45) (+ 45 56) oops)'))
// console.log(expressionParserEval('(if (= 12 12) (+ 78 2) 9)'))

// console.log(expressionParserEval('(define circle_area ( lambda (r) (* pi r r)))'))
// console.log(expressionParserEval('(circle_area 3 )'))
// console.log(expressionParserEval('(define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))'))
// console.log(expressionParserEval('(fact 15)'))

// console.log(expressionParserEval('(quote (define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1)))))) )'))
// console.log(expressionParserEval('(define twice (lambda (x) (* 2 x) ) )'))
// console.log(expressionParserEval('(twice (+ 78 9) )'))
// console.log(expressionParserEval('(define fib (lambda (n) (if (< n 2) 1 (+ (fib (- n 1) ) (fib (- n 2) )))))'))
// console.log(expressionParserEval('(fib 10 )'))
// console.log(expressionParserEval('(sqrt 49 )'))
// console.log(expressionParserEval('(define triplet (lambda (x y z) (+ x (* y z) ) ) )'))
// console.log(expressionParserEval('(triplet (sqrt 49) 6 7)'))
