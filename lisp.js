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
  sqrt: (input) => Math.sqrt(input)
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

const globalEnvParser = (input, env) => {
  const args = []
  const firstEmptyspaceIndex = input.indexOf(' ')
  const textChar = input.slice(0, firstEmptyspaceIndex)
  if (!globalEnv[textChar]) return null
  if (typeof globalEnv[textChar] === 'object') {
    input = spaceParser(input.slice(firstEmptyspaceIndex))
    return result
  }
  const operation = textChar
  input = spaceParser(input.slice(firstEmptyspaceIndex))
  // parse the arguments
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
  const parsers = [defineParser, beginParser, ifParser, quoteParser, globalEnvParser]
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
    if (!env[result[0]] !== undefined) {
      return [env[result[0]], result[1]]
    }
    if (!env[result[0]]) return null
    return [env[result[0]], result[1]]
  }
  return null
}

const rl = readline.createInterface(process.stdin, process.stdout)
rl.setPrompt('lispi> ')
rl.prompt()
rl.on('line', function (line) {
  if (line === 'quit') rl.close()
  console.log(expressionParserEval(line))
  rl.prompt()
}).on('close', function () {
  process.exit(0)
})
