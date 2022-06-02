function numParser(input) {
  const reg = /^(\-?\d+(\.\d+)?([eE][+-]?\d+)?)/; const parseOut = input.match(reg)
  if (parseOut) {
    return [Number(parseOut[0]), input.slice(parseOut[0].length)]
  }
  return null
}

function spaceParser(input) {
  const reg = /^\s+/
  if (input.match(reg) !== null) {
    return [input.match(reg)[0].slice(1), input.slice(input.match(reg)[0].length)]
  }
  return null
}

function stringParser(input) {
  if (!input.startsWith('"')) return null
  const escChar = ['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']
  const invalid = [9, 10] // character code of tab and line
  let i = 1
  while (input[i] !== '"') {
    if (invalid.includes(input[i].charCodeAt(0))) return null
    if (input[i] === '\\') {
      if (!escChar.includes(input[i + 1])) return null
      if (input[i + 1] === 'u') {
        i += 4
      }
      i += 2
    } else i++
  }
  return [input.slice(1, i), input.slice(i + 1)]
}

function exprParser(input) {
  if (input[0] === '(') {
    let parseOut = input[0]
    input = input.substr(1)
    while (input[0] !== ')') {
      if (input[0] === '(') {
        const res = exprParser(input)
        parseOut += res[0]
        input = res[1]
        continue
      }
      parseOut += input[0]
      input = input.substr(1)
    }
    parseOut += input[0]
    return [parseOut, input.substr(1)]
  } return null
}

function update(input) {
  return Object.assign({}, input[0], input[1])
}

function local(argument) {
  const temp = {}
  for (const x in argument[1]) {
    temp[argument[x]] = argument[1][x]
  }
  return temp
}

const lib = {
  '+': array => array.reduce((a, b) => a + b),
  '-': array => array.reduce((a, b) => a - b),
  '*': array => array.reduce((a, b) => a * b),
  '/': array => array.reduce((a, b) => a / b),
  '>': array => array.reduce((a, b) => a > b),
  '<': array => array.reduce((a, b) => a < b),
  '>=': array => array.reduce((a, b) => a >= b),
  '<=': array => array.reduce((a, b) => a <= b),
  '=': array => array.reduce((a, b) => a === b),
  max: array => Math.max(...array),
  min: array => Math.min(...array),
  begin: array => array.pop(),
  print: array => console.log(array.join(''))
}
const globalScope = lib

function lisp(input) {
  input = programParser(input)
  while (input[1]) {
    input = programParser(input[1], input[2])
  }
  return input[0]
}

function expression(input, env = globalScope) {
  if (input[0] === '(') {
    const reg = /\(\s*([^\(\s\)]+)\s*/
    const temp = [input.match(reg)[1], input.substr(input.match(reg)[0].length)]
    const ops = temp[0]
    input = temp[1]
    if (ops in env) {
      return sExpressions(ops, input, env)
    } else if (ops === 'define') {
      return defineParser(input, env)
    } else if (ops === 'if') {
      return ifParser(input, env)
    }
  }
  return null
}

function sExpressions(ops, input, env = globalScope) {
  const arr = []; let temp
  while (input[0] !== ')' && input.length !== 0) {
    if (spaceParser(input)) {
      input = spaceParser(input)[1]
    }
    temp = programParser(input, env)
    arr.push(temp[0])
    input = temp[1]
  }
  return [env[ops](arr, env), input.substr(1), env]
}

function defineParser(input, env) {
  let result1, result2, inner
  result1 = input.match(/^\(?\s*([^\(\s\)]+)\s*/)
  inner = local([[result1[1]], [undefined]])
  input = input.substr(result1[0].length)
  if (input[0] !== ')') {
    result2 = programParser(input)
    inner[result1[1]] = result2[0]
    input = result2[1]
  }
  env = update([env, inner])

  return ['', input.substr(1), env]
}

function ifParser(input, env = globalScope) {
  // parse "(if "
  /*
    const result = expression(input, env)
    if (result === null) return null
  
    const trueResult = exprParser(result[1], env)
    if (trueResult === null) return null
  
    const falseResult = exprParser(trueResult[1], env)
    if (falseResult === null) return null
  
    // check ")" in falseResult
  
    if (result[0]) {
      return expression(trueResult[0], env)
    }
    return expression(falseResult[0], env)
  */

  const array = []; let result
  while (input[0] !== ')') {
    if (spaceParser(input)) {
      input = spaceParser(input)[1]
      continue
    }
    result = exprParser(input)
    array.push(result[0])
    input = result[1]
  }
  if (programParser(array[0], env)[0]) {
    return [programParser(array[1], env)[0], input.substr(1), env]
  }
  return [programParser(array[2], env)[0], input.substr(1), env]

}

function userDef(input, env = globalScope) {
  const reg = /[^\(\s\)]+/

  if (input.match(reg) !== null) {
    const user = input.match(reg)[0]
    input = input.substr(user.length)
    if (user in env) {
      return [env[user], input, env]
    }
  }
  return null
}

function programParser(input, env = globalScope) {
  let result

  if (spaceParser(input) !== null) {
    input = spaceParser(input)[1]
  }

  if (numParser(input) !== null) {
    result = numParser(input)
  }
  else if (stringParser(input) !== null) {
    result = stringParser(input)
  }
  else if (input[0] === '(') {
    result = expression(input, env)
    env = result[2]
  }
  else if (userDef(input, env)) {
    result = userDef(input, env)
    env = result[2]
  }
  input = result[1]
  if (result[0] === undefined) {
    return ['', input, env]
  }
  return [result[0], input, env]
}

console.log(lisp('(- 1 3)'))
console.log(lisp('(if (< 3 4) (+ 1 3) (* 2 3))'))
console.log(lisp('(if (< 3 4) (* 1 1) (* 2 2))'))
console.log(lisp('(if (< 4 3) (+ 1 1) (- 4 1))'))
