const Capability = require('./capability')

const create = (name, children, capabilities, meta = {}) => {
  return { name, children, capabilities, meta: Object.assign({}, meta) }
}

const fromJson = (json) => {
  return create('', [], json.map(Capability.fromOp))
}

const addChild = (child, ambient) => {
  ambient.children.push(Object.assign({}, child))
  return Object.assign({}, ambient)
}

const removeChild = (child, ambient) => {
  const isNotEqual = (e) => e.name !== child.name
  ambient.children = ambient.children.filter(isNotEqual)
  return Object.assign({}, ambient)
}

const replaceChild = (child, ambient) => {
  const isEqual = (e) => e.name === child.name
  const target = ambient.children.find(isEqual)
  if (target) {
    ambient = removeChild(target, ambient)
    ambient.children.push(Object.assign({}, child))
  }
  return Object.assign({}, ambient)
}

const addCapabilities = (capabilities, ambient) => {
  ambient.capabilities = [...ambient.capabilities, ...capabilities]
  return Object.assign({}, ambient)
}

const getCapability = (op, targetName, ambient) => {
  const findCapability = (e) => e.op === op && e.args[0] === targetName
  const cap = ambient.capabilities.find(findCapability)
  return cap
}

const removeCapability = (capability, ambient) => {
  const isEqual = (e) => !(e.op === capability.op && e.args[0] === capability.args[0])
  ambient.capabilities = ambient.capabilities.filter(isEqual)
  return ambient
}

const consumeCapability = (capability, ambient) => {
  ambient = removeCapability(capability, ambient)
  ambient.capabilities = [...capability.next, ...ambient.capabilities]
  return ambient
}

const addMeta = (args1, args2, ambient, parent) => {
  ambient.meta = args1.reduce((res, acc, i) => {
    const val = args2[i]
    res[acc] = val
    return res
  }, ambient.meta)
  return ambient
}

const ambientToString = (ambient, printMeta = true) => {
  const name = ambient.name
  const caps = ambient.capabilities.map(Capability.toString).join('|')
  return `${name}[${caps}]${printMeta ? metaToString(ambient) : ''}`
}

const ambientToString2 = (ambient) => {
  const name = ambient.name
  const children = ambient.children.map(ambientToString2).join('|')
  return `${name}[${children}]`
}

const metaToString = (ambient) => {
  const format = (e) => {
    const val = ambient.meta[e]
    const caps = typeof val === 'string'
      ? val
      : (val.name
        ? (ambientToString2(val) + metaToString(val))
        : Capability.toString(val))
    return `${e}:=${caps}`
  }
  return `{${Object.keys(ambient.meta).map(format).join(', ')}}`
}

const ambientTreeToString = (ambient, printMeta = true) => {
  let format = (ambient, prefix, first, last) => {
    let prefixCurrent = first ? '' : last ? '└─ ' : '├─ '
    let result = prefix + prefixCurrent + ambientToString(ambient) + '\n'
    let children = ambient.children || []
    if (children.length === 0) {
      return result
    } else {
      let isLast = (i, arr) => i === arr.length - 1
      let prefixChild = prefix + (first ? '' : last ? '   ' : '│  ')
      let f = (e, i) => format(e, prefixChild, false, isLast(i, children))
      let mapped = children ? children.map(f) : []
      return result + mapped.join('')
    }
  }
  return format(ambient, '', true, true)
}

const toValue = (ambient) => {
  const isDefined = (e) => e !== undefined && e !== null

  // Primitive type string
  const stringValue = (e) => {
    if (e.children[0].name === 'plus') {
      const plus = e.children[0]
      const left = plus.children.find(e => e.name === 'l')
      const right = plus.children.find(e => e.name === 'r')
      if (!left) throw new Error('Left value not found')
      if (!right) throw new Error('Right value not found')
      const leftValue = left.children[0].children[0].name
      const rightValue = right.children[0].children[0].name
      return leftValue + rightValue
    } else {
      return e.children[0]
    }
  }

  const intValue = (e) => {
    if (e.children[0].name === 'plus') {
      const plus = e.children[0]
      const left = plus.children.find(e => e.name === 'l')
      const right = plus.children.find(e => e.name === 'r')
      if (!left) throw new Error('Left value not found')
      if (!right) throw new Error('Right value not found')
      const leftValue = left.children[0].children[0].name
      const rightValue = right.children[0].children[0].name
      return leftValue + rightValue
    } else {
      return e.children[0]
    }
  }

  // TODO: other primitive types

  // Produce a single value
  const value = ambient.children.map(e => {
    if (e.name === 'string') {
      return stringValue(e)
    } else if (e.name === 'int') {
      return intValue(e)
    } else {
      // don't know how to transform the ambient to a value
    }
  }).filter(isDefined)
  return value[0]
}

module.exports = {
  create,
  fromJson,
  addChild,
  removeChild,
  replaceChild,
  addCapabilities,
  getCapability,
  removeCapability,
  consumeCapability,
  addMeta,
  metaToString,
  ambientToString,
  ambientToString2,
  ambientTreeToString,
  toValue
}
