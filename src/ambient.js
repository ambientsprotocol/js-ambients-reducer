const Capability = require('./capability')

const create = (name, children, capabilities, meta = {}) => {
  return { name, children, capabilities, meta: Object.assign({}, meta) }
}

const fromJson = (json) => {
  return create('', [], json.map(Capability.fromOp))
}

const addChild = (child, parent) => {
  parent.children.push(child)
  return parent
}

const removeChild = (child, parent) => {
  const isNotEqual = (e) => e.name !== child.name
  parent.children = parent.children.filter(isNotEqual)
  return parent
}

const replaceChild = (child, parent) => {
  const isEqual = (e) => e.name === child.name
  const ambient = parent.children.find(isEqual)
  if (ambient) {
    parent = removeChild(child, parent)
    parent.children.push(child)
  }
  return parent
}

const addCapabilities = (capabilities, ambient) => {
  ambient.capabilities = [...ambient.capabilities, ...capabilities]
  return ambient
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
  ambientTreeToString
}
