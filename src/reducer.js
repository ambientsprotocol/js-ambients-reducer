const {
  create,
  addChild,
  removeChild,
  replaceChild,
  addCapabilities,
  getCapability,
  removeCapability,
  consumeCapability,
  toValue,
  addMeta
} = require('../src/ambient')

const Capability = require('../src/capability')
const { isDefined } = require('../src/utils')

const applyAtomicOps = (ambient, parent, callback, step) => {
  const atomicOps = ambient.capabilities.filter(Capability.isAtomic)
  if (atomicOps.length > 0) {
    const reduceOne = (res, e) => applyOperation(e, res.ambient, res.parent, callback, step)
    return atomicOps.reduce(reduceOne, { ambient, parent })
  }
  return {ambient, parent}
}

const applyOperation = (capability, ambient, parent, callback, step = -1) => {
  // Validate the capability
  const op = capability.op
  if (!Capability.isValid(capability)) throw new Error(`Invalid capability '${op}'`)

  // Make sure to use the source ambient from its parent (latest state from previous reductions)
  // ambient = parent ? parent.children.find(e => e.name === ambient.name) : ambient

  // Get the operation target's name
  // TODO: is there a case where the target name should be fetched from meta?
  const isMetaName = capability.args[0] && isDefined(capability.args[0].subst)
  const name = isMetaName ? capability.args[0].subst : capability.args[0]

  // Get the capability that will be consumed
  const cap = getCapability(op, name, ambient)

  // Process the operation
  if (op === 'create') {
    if (isMetaName && cap) {
      // FIX: this branch is exactly the same as else/if 'substitute', re-use same code
      const substitute = ambient.meta[name] || name
      if (!isDefined(substitute)) throw new Error('Substitute value not found from meta')

      ambient = removeCapability(cap, ambient)

      if (substitute.op) {
        // If the value is a capability (or an an op), add them as capabilities
        ambient = addCapabilities([substitute], ambient)
      } else if (substitute.name) {
        // If the value is an ambient, add it as a child
        ambient = addChild(substitute, ambient)
      }

      if (callback) {
        callback('create', capability, ambient, step, { source: ambient.name, target: substitute })
      }

      const res = applyAtomicOps(ambient, parent, callback, step)
      if (res.parent) ambient = replaceChild(res.ambient, res.parent)
    } else if (cap) {
      const created = create(name, [], capability.next, ambient.meta)
      ambient = addChild(created, ambient)
      ambient = removeCapability(cap, ambient)
      if (callback) {
        callback('create', capability, ambient, step, { source: ambient.name, target: name })
      }
      const res = applyAtomicOps(created, ambient, callback, step)
      ambient = replaceChild(res.ambient, res.parent)
    }
    if (parent) {
      parent = replaceChild(ambient, parent)
    }
  } else if (op === 'write') {
    if (!cap) throw new Error('Capability not found')

    const targetName = ambient.meta[name] || name
    let target = ambient.children.find(e => e.name === targetName)
    if (!target) throw new Error('Target not found!')

    const cocap = target.capabilities.find(e => e.op === 'write_')
    if (!cocap) throw new Error('Co-Capability not found')

    const valuesToWrite = cap.args.slice(1, cap.args.length).map(e => {
      return e.subst ? ambient.meta[e.subst] : (ambient.meta[e] || e)
    })

    target = consumeCapability(cocap, target)
    target = addMeta(cocap.args, valuesToWrite, target)
    ambient = consumeCapability(cap, ambient)

    if (callback) {
      callback('write', cap, ambient, step, { source: ambient.name, target: name, args: valuesToWrite })
      callback('write_', cocap, target, step, { source: name, caller: ambient.name, args: cocap.args })
    }

    const res = applyAtomicOps(target, ambient, callback, step)
    ambient = res.parent

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
      const findValue = (e) => e.subst ? target.meta[e.subst] : (target.meta[e] || target.children.find(a => a.name === e))
      const values = cocap.args.map(findValue).filter(isDefined)

      if (values.length > 0) {
        target = consumeCapability(cocap, target)
        ambient = addMeta(cap.args.slice(1, cap.args.length), values, ambient, parent)
        ambient = consumeCapability(cap, ambient)

        if (callback) {
          callback('read', cap, ambient, step, { source: ambient.name, target: cap.args[0], args: cap.args })
          callback('read_', cocap, target, step, { source: name, caller: ambient.name, values: values })
        }

        const res = applyAtomicOps(ambient, parent, callback, step)
        ambient = res.ambient
        if (parent) {
          parent = res.parent
        }
      }
    }
  } else if (op === 'substitute' && cap) {
    const substitute = ambient.meta[name]
    if (!isDefined(substitute)) throw new Error('Substitute value not found from meta')

    ambient = consumeCapability(cap, ambient)

    if (substitute.op) {
      // If the value is a capability (or an an op), add them as capabilities
      ambient = addCapabilities([substitute], ambient)
      // If the new capabilities were atomic, apply them
      const res = applyAtomicOps(ambient, parent, callback, step)
      ambient = replaceChild(res.ambient, res.parent)
    } else if (substitute.name) {
      // If the value is an ambient, add it as a child
      ambient = addChild(substitute, ambient)
    }

    if (callback) {
      callback('substitute', cap, ambient, step, { source: ambient.name, target: name, value: substitute })
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

      if (callback) {
        callback('in', cap, ambient, step)
        callback('in_', cocap, target, step)
      }
    }
  }

  return { parent: parent ? Object.assign({}, parent) : parent, ambient: Object.assign({}, ambient) }
}

const reduceAmbient = (ambient, parent = null, callback, step = 0) => {
  const reduceRec = (res, e) => reduceAmbient(e, res.parent, callback, step)
  const reduceOne = (res, e) => applyOperation(e, res.ambient, res.parent, callback, step)
  const updated1 = ambient.children.reduce(reduceRec, { parent: ambient, ambient: null })
  const updated2 = updated1.parent || updated1.ambient
  const res = updated2.capabilities.reduce(reduceOne, { parent, ambient: updated2 })
  return res
}

module.exports = {
  applyOperation,
  reduceAmbient
}
