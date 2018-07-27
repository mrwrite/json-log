var util = require('util')
var isTypedArray = require('is-typedarray')
var serializeError = require('serialize-error')
var hasOwnProperty = Object.prototype.hasOwnProperty

function toJsonCore (data, seen) {
  switch (typeof data) {
    case 'boolean':
    case 'number':
    case 'string':
      return JSON.stringify(data)
    case 'symbol':
      return JSON.stringify(data.toString())
    case 'undefined':
    case 'function':
      return undefined
  }
  if (data === null) {
    return 'null'
  } else if (data instanceof Error) {
    return JSON.stringify(serializeError(data))
  } else if (Buffer.isBuffer(data)) {
    return JSON.stringify(util.inspect(data))
  } else if (isTypedArray(data)) {
    return JSON.stringify(util.inspect(data, {maxArrayLength: 10, breakLength: Infinity}))
  }
  if (seen.indexOf(data) >= 0) {
    return '"[Circular]"'
  }
  seen.push(data)
  var out = ''
  var k, v, i
  if (Array.isArray(data)) {
    for (i = 0; i < data.length; i++) {
      v = toJsonCore(data[i], seen.slice(0))
      out += (v || 'null') + ','
    }
    return '[' + out.slice(0, -1) + ']'
  }
  for (k in data) {
    if (hasOwnProperty.call(data, k)) {
      v = toJsonCore(data[k], seen.slice(0))
      if (v) {
        out += JSON.stringify(k) + ':' + v + ','
      }
    }
  }
  return '{' + out.slice(0, -1) + '}'
}

function toJson (data) {
  return toJsonCore(data, [])
}

function stringifyPairs (data) {
  if (data instanceof Error) {
    data = {err: data}
  }
  var str = toJson(data)
  if (!str || str === 'null' || str === '{}') {
    return ''
  }
  if (str[0] === '{') {
    return str.slice(1, -1) + ','
  }
  return '"data":' + str + ','
}

var levels = {
  error: 1,
  warn: 2,
  info: 3
}

function logIt (level, message, ctx) {
  var line = '{"level":' + level + ',' + ctx + '"msg":' + (toJson(message) || 'null') + '}\n'
  if (level > levels.error) {
    process.stdout.write(line)
  } else {
    process.stderr.write(line)
  }
  return line
}

function Logger (ctx) {
  function mkLevel (lname) {
    return function (message, data) {
      if (arguments.length === 1 && typeof message !== 'string') {
        data = message
        message = null
      }
      return logIt(levels[lname], message, ctx + stringifyPairs(data))
    }
  }
  return {
    error: mkLevel('error'),
    warn: mkLevel('warn'),
    info: mkLevel('info'),
    child: function (moreCtx) {
      return Logger(ctx + stringifyPairs(moreCtx))
    }
  }
}

module.exports = Logger('')
module.exports.toJson = toJson
module.exports.stringifyPairs = stringifyPairs
