let result
const numberParser = input => (result = input.match(/^-?(0|([1-9][0-9]*))(\.[0-9]+)?([E][+-]?[0-9]+)?/i)) && [result[0] * 1, input.slice(result[0].length)]

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

const defineParser = input => {
  if (!input.startsWith('define')) return null
  input = input.slice(6).trim()
  const result = symbolParser(input)
  if (!result) return null
  const identifyer = result[0]
  const value = expressionParserEval(result[1])
  if (!value) return null
  input = value[1].trim()
  if (input[0] !== ')') return null
  globalEnv[identifyer] = value[0]
  return [identifyer, value[1].slice(1).trim()]
}

const beginParser = (input, env) => {
  let result
  if (!input.startsWith('begin')) return null
  input = input.slice(5)
  while (input[0] !== ')') {
    result = expressionParserEval(input, env)
    input = result[1].trim()
  }
  return [result[0], input.slice(1)]
}

const ifParser = (input, env = globalEnv) => {
  if (!input.startsWith('if')) return null
  let result
  input = input.slice(2).trim()
  result = sExpressionParser(input, env)
  if (!result) return null
  const condition = result[0]
  input = result[1].trim()
  if (condition) {
    result = expressionParserEval(input, env)
    if (!result) return null
    input = parseCode(result[1])[1]
    if (!input) return null
    input = input.trim()
    if (input[0] !== ')') return null
    return [result[0], input.slice(1)]
  }
  input = parseCode(result[1])[1]
  result = expressionParserEval(input, env)
  if (!result) return null
  input = result[1].trim()
  input.trim()
  if (input !== ')') return null
  return [result[0], input.slice(1)]
}

const globalEnvParser = (input, env = globalEnv) => {
  const args = []
  let result
  const firstEmptyspaceIndex = input.indexOf(' ')
  const textChar = input.slice(0, firstEmptyspaceIndex)
  if (!globalEnv[textChar]) return null
  if (typeof globalEnv[textChar] === 'object') {
    input = input.slice(firstEmptyspaceIndex).trim()
    return result
  }
  const operation = textChar
  input = input.slice(firstEmptyspaceIndex).trim()
  // parse the arguments
  while (input[0] !== ')') {
    result = expressionParserEval(input, env)
    if (!result) return null
    args.push(result[0])
    input = result[1].trim
  }
  return [globalEnv[operation](args), input.slice(1)]
}

const parseCode = input => {
  let result
  input = input.trim()
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
        input = input.slice(1).trim()
        return [result, input]
      }
      result = result + input[0]
      input = input.slice(1)
    }
  }
  return null
}
const sExpressionParser = (input, env) => {
  let result
  if (input[0] !== '(') return null
  input = input.slice(1).trim()
  const parsers = [defineParser, beginParser, ifParser, globalEnvParser]
  for (const parser of parsers) {
    result = parser(input, env)
    if (result) return result
  }
  return null
}

const expressionParserEval = (input, env) => {
  input = input.trim()
  if ((result = sExpressionParser(input, env))) return [result[0], result[1]]
  if ((result = numberParser(input))) return [result[0], result[1]]
  if ((result = symbolParser(input))) {
    if (!env[result[0]]) return null
    return [env[result[0]], result[1]]
  }
  return null
}
console.log(expressionParserEval('(begin (define x 5) (* pi (* x x)))'))
