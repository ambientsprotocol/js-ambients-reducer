const {
  create,
  addChild,
  removeChild,
  replaceChild,
  addCapabilities,
  getCapability,
  removeCapability,
  consumeCapability,
  addMeta
} = require('../src/ambient')

const Capability = require('../src/capability')
const { isDefined } = require('../src/utils')

const applyOperation = (capability, ambient, parent) => {
  // Validate the capability
  const op = capability.op
  if (!Capability.isValid(capability)) throw new Error(`Invalid capability '${op}'`)

  // Make sure to use the source ambient from its parent (latest state from previous reductions)
  ambient = parent ? parent.children.find(e => e.name === ambient.name) : ambient

  // Get the operation target's name
  // TODO: is there a case where the target name should be fetched from meta?
  const name = capability.args[0]
  if (!name) throw new Error('Name not found')

  // Get the capability that will be consumed
  const cap = getCapability(op, name, ambient)

  // Process the operation
  if (op === 'create') {
    const created = create(name, [], capability.next, ambient.meta)
    ambient = addChild(created, ambient)
    ambient = removeCapability(cap, ambient)

    if (created.capabilities.find(Capability.isAtomic)) {
      const res = reduceAmbient(created, ambient)
      ambient = replaceChild(res.ambient, res.parent)
    }

    if (parent) {
      parent = replaceChild(ambient, parent)
    }
  } else if (op === 'write') {
    const targetName = ambient.meta[name] || name
    let target = ambient.children.find(e => e.name === targetName)
    if (!target) throw new Error('Target not found!')

    const cocap = target.capabilities.find(e => e.op === 'write_')
    if (!cocap) throw new Error('Co-Capability not found')

    const valuesToWrite = cap.args.slice(1, cap.args.length).map(e => ambient.meta[e] || e)

    target = consumeCapability(cocap, target)
    target = addMeta(cocap.args, valuesToWrite, target)
    ambient = consumeCapability(cap, ambient)

    if (target.capabilities.find(Capability.isAtomic)) {
      const res = reduceAmbient(target, ambient)
      ambient = res.parent
      target = res.ambient
    }

    if (parent) {
      parent = replaceChild(ambient, parent)
    }
  } else if (op === 'read') {
    const targetName = ambient.meta[name] || name
    let target = ambient.children.find(e => e.name === targetName)
    if (!target) throw new Error('Target not found!')

    const cocap = target.capabilities.find(a => a.op === 'read_' && a.args.length === cap.args.length - 1)

    if (cocap) {
      const isDefined = (e) => e !== undefined && e !== null
      const findValue = (e) => target.meta[e] || target.children.find(a => a.name === e)
      const values = cocap.args.map(findValue).filter(isDefined)

      if (values.length > 0) {
        target = consumeCapability(cocap, target)
        ambient = addMeta(cap.args.slice(1, cap.args.length), values, ambient, parent)
        ambient = consumeCapability(cap, ambient)
        if (ambient.capabilities.find(Capability.isAtomic)) {
          const res = reduceAmbient(ambient, parent)
          ambient = res.ambient
          if (parent) parent = res.parent
        }
      }
    }
  } else if (op === 'substitute') {
    const substitute = ambient.meta[name]
    if (!isDefined(substitute)) throw new Error('Substitute value not found from meta')

    ambient = consumeCapability(cap, ambient)

    if (substitute.op) {
      // If the value is a capability (or an an op), add them as capabilities
      ambient = addCapabilities([substitute], ambient)
    } else if (substitute.name) {
      // If the value is an ambient, add it as a child
      ambient = addChild(substitute, ambient)
    }
  } else if (op === 'in') {
    let target = parent.children.find(e => e.name === name)
    if (!target) throw new Error('Target not found!')

    const cocap = target.capabilities.find(e => e.op === 'in_' && e.args[0] === ambient.name)

    if (cocap) {
      ambient = consumeCapability(cap, ambient)
      target = addChild(ambient, target)
      target = consumeCapability(cocap, target)
      parent = removeChild(ambient, parent)
      parent = replaceChild(target, parent)
    }
  }

  return { parent: parent ? Object.assign({}, parent) : parent, ambient: Object.assign({}, ambient) }
}

const reduceAmbient = (ambient, parent = null) => {
  const reduceRec = (res, e) => reduceAmbient(e, res.parent)
  const reduceOne = (res, e) => applyOperation(e, res.ambient, res.parent)
  const updated1 = ambient.children.reduce(reduceRec, { parent: ambient, ambient: null })
  const updated2 = updated1.parent || updated1.ambient
  const res = updated2.capabilities.reduce(reduceOne, { parent, ambient: updated2 })
  return res
}

module.exports = {
  applyOperation,
  reduceAmbient
}
