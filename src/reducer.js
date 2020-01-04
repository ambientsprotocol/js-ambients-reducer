const {
  create,
  addChild,
  removeChild,
  replaceChild,
  addCapabilities,
  getCapability,
  removeCapability,
  consumeCapability,
  addMeta,
  toValue,
  ambientTreeToString
} = require('../src/ambient')

const Capability = require('../src/capability')
const { isDefined } = require('../src/utils')

const findTarget = (ambient, targetName) => {
  return ambient.children.find(e => e.name === targetName)
}

const findMatchingCocap = (source, target, cap) => {
  let cocap
  if (cap.op === 'write') {
    cocap = target.capabilities.find(e => e.op === 'write_')
  } else if (cap.op === 'read') {
    cocap = target.capabilities.find(e => e.op === 'read_' && e.args.length === cap.args.length - 1)
  }
  else if (cap.op === 'in') {
    cocap = target.capabilities.find(e => e.op === 'in_' && e.args[0] === source.name)
  }
  return cocap
}

const applyAtomicOps = (ambient, parent, callback, step) => {
  const atomicOps = ambient.capabilities.filter(Capability.isAtomic)
  if (atomicOps.length > 0) {
    const reduceOne = (res, e) => applyOperation(e, res.ambient, res.parent, callback, res.step, res.maxStep)
    return atomicOps.reduce(reduceOne, { ambient, parent, step, maxStep: step })
  }
  return {
    ambient, 
    parent, 
    step,
    maxStep: step - 1
  }
}

const applyOperation = (capability, ambient, parent, callback, step = -1, maxStep) => {
  // Validate the capability
  const op = capability.op
  if (!Capability.isValid(capability)) throw new Error(`Invalid capability '${op}'`)

  // Get the operation target's name
  // TODO: is there a case where the target name should be fetched from meta?
  const isMetaName = capability.args[0] && isDefined(capability.args[0].subst)
  const name = isMetaName ? capability.args[0].subst : capability.args[0]

  // Get the capability that will be consumed
  const cap = getCapability(op, name, ambient)

  // Process the operation
  if (op === 'create') {
    if (isMetaName && cap) {
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

      const res = applyAtomicOps(ambient, parent, callback, step + 1)
      // step = Math.max(step, res.step)
      maxStep = Math.max(maxStep, res.maxStep)

      if (res.parent) {
        ambient = replaceChild(res.ambient, res.parent)
      }
    } else if (cap) {
      const created = create(name, [], capability.next, ambient.meta)
      ambient = addChild(created, ambient)
      ambient = removeCapability(cap, ambient)

      if (callback) {
        callback('create', capability, ambient, step, { source: ambient.name, target: name })
      }

      const res = applyAtomicOps(created, ambient, callback, step + 1)
      // step = Math.max(step, res.step)
      maxStep = Math.max(maxStep, res.maxStep)
      if (res.parent) {
        ambient = replaceChild(res.ambient, res.parent)
      }
    }

    if (parent) {
      parent = replaceChild(ambient, parent)
    }
  } else if (op === 'write') {
    let target = findTarget(ambient, ambient.meta[name] || name)

    if (target) {
      let cap2 = capability
      const cocap = findMatchingCocap(ambient, target, cap2)

      if (cocap) {
        const valuesToWrite = cap.args.slice(1, cap.args.length).map(e => {
          return e.subst ? ambient.meta[e.subst] : (ambient.meta[e] || e)
        })

        target = consumeCapability(cocap, target)
        target = addMeta(cocap.args, valuesToWrite, target)
        ambient = consumeCapability(cap, ambient)

        if (callback) {
          callback('write', cap, ambient, step, { source: ambient.name, target: name, args: valuesToWrite })
          callback('write_', cocap, target, step, { source: name, target: cocap.args[0], caller: ambient.name, args: cocap.args })
        }

        const res = applyAtomicOps(target, ambient, callback, step + 1)
        // step = Math.max(step, res.step)
        // maxStep = Math.max(maxStep, res.step)
        maxStep = Math.max(maxStep, res.maxStep)
        ambient = res.parent

        if (parent) {
          parent = replaceChild(ambient, parent)
        }
      }
    }
  } else if (op === 'read') {
    let target = findTarget(ambient, ambient.meta[name] || name)

    if (target) {
      let cap2 = capability
      const cocap = findMatchingCocap(ambient, target, cap2)

      if (cocap) {
        const findValue = (e) => e.subst ? target.meta[e.subst] : (target.meta[e] || target.children.find(a => a.name === e))
        const values = cocap.args.map(findValue).filter(isDefined)

        if (values.length > 0) {
          target = consumeCapability(cocap, target)
          ambient = addMeta(cap.args.slice(1, cap.args.length), values, ambient, parent)
          ambient = consumeCapability(cap, ambient)

          if (callback) {
            callback('read', cap, ambient, step, { source: ambient.name, target: cap.args[0], args: cap.args })
            callback('read_', cocap, target, step, { source: target, target: cocap.args[0], caller: ambient.name, values: values })
          }

          const res = applyAtomicOps(ambient, parent, callback, step + 1)
          // step = Math.max(step, res.step)
          // maxStep = Math.max(maxStep, res.step)
          maxStep = Math.max(maxStep, res.maxStep)
          ambient = res.ambient
          if (parent) {
            parent = res.parent
          }
        }
      }
    }
  } else if (op === 'in') {
    let cap2 = capability
    let target = parent ? findTarget(parent, name) : findTarget(ambient, name)

    if (target) {
      const cocap = findMatchingCocap(ambient, target, cap2)

      if (cocap) {
        ambient = consumeCapability(cap, ambient)
        target = addChild(ambient, target)
        target = consumeCapability(cocap, target)
        parent = removeChild(ambient, parent)
        parent = replaceChild(target, parent)

        if (callback) {
          callback('in', cap, ambient, step, { source: ambient, target: target })
          callback('in_', cocap, target, step, { source: target, target: cocap.args[0], caller: ambient })
        }
      }
    }
  } else if (op === 'substitute' && cap) {
    const substitute = ambient.meta[name]
    if (!isDefined(substitute)) throw new Error('Substitute value not found from meta')

    ambient = consumeCapability(cap, ambient)

    if (callback) {
      callback('substitute', cap, ambient, step, { source: ambient.name, target: name, value: substitute })
    }

    if (substitute.op) {
      // If the value is a capability (or an an op), add them as capabilities
      ambient = addCapabilities([substitute], ambient)
      // If the new capabilities were atomic, apply them
      const res = applyAtomicOps(ambient, parent, callback, step + 1)
      ambient = replaceChild(res.ambient, res.parent)
      // maxStep = Math.max(maxStep, res.step)
      maxStep = Math.max(maxStep, res.maxStep)
    } else if (substitute.name) {
      // If the value is an ambient, add it as a child
      ambient = addChild(substitute, ambient)
    }
  }

  return {
    parent,
    ambient,
    step,
    maxStep
  }
}

const getTransitions = (capability, ambient, parent, callback, step = -1) => {
  // Validate the capability
  const op = capability.op
  if (!Capability.isValid(capability)) throw new Error(`Invalid capability '${op}'`)

  // Get the operation target's name
  const isMetaName = capability.args[0] && isDefined(capability.args[0].subst)
  const name = isMetaName ? capability.args[0].subst : capability.args[0]
  const cap = capability

  let transitions = []
  let parentTransitions = []

  // Process the operation
  if (op === 'create') {
    if (cap) {
      transitions.push({ source: ambient, target: name, cap, cocap: null })
    }
  } else if (op === 'write' || op === 'read') {
    if (cap) {
      const target = findTarget(ambient, ambient.meta[name] || name)
      if (target) {
        const cocap = findMatchingCocap(ambient, target, cap)
        if (cocap) {
          transitions.push({ source: ambient, target, cap, cocap })
        }
      }
    }
  } else if (op === 'in') {
    const target = findTarget(parent, name)
    if (target) {
      const cocap = findMatchingCocap(ambient, target, cap)
      if (cocap) {
        transitions.push({ source: ambient, target, cap, cocap })
      }
    }
  } else if (op === 'substitute') {
    if (cap) {
      transitions.push({ source: ambient, target: null, cap, cocap: null })
    }
  }

  return {
    transitions,
    parentTransitions
  }
}

const applyTransition = (transition, ambient, parent, callback, step = -1, maxStep = 0) => {
  return applyOperation(transition.cap, ambient, parent, callback, step, maxStep)
}

const findTransitions = (ambient, parent) => {
  const reduceRec = (res, e) => findTransitions(e, res.parent)
  const reduceOne = (res, e) => {
    const { transitions, parentTransitions } = getTransitions(e, res.ambient, res.parent)

    const t1 = [...res.ambient.transitions, ...transitions]
    ambient = Object.assign({}, res.ambient, { transitions: t1 })

    if (res.parent) {
      const t2 = [...res.parent.transitions, ...parentTransitions]
      parent = Object.assign({}, res.parent, {transitions: t2})
    }

    if (parent) {
      parent = replaceChild(ambient, parent)
    }

    return {
      parent,
      ambient
    }
  }
  const updated1 = ambient.children.reduce(reduceRec, { parent: ambient, ambient: null })
  const updated2 = updated1.parent || updated1.ambient
  const res = updated2.capabilities.reduce(reduceOne, { parent, ambient: updated2 })
  return res

}

const processTransitions = (ambient, parent = null, callback, step = 0, maxStep) => {
  const reduceRec = (res, e) => processTransitions(e, res.parent, callback, step, res.maxStep)
  const reduceOne = (res, e) => applyTransition(e, res.ambient, res.parent, callback, step, res.maxStep)
  const updated1 = ambient.children.reduce(reduceRec, { parent: ambient, ambient: null, step, maxStep: step })
  // console.log("1>>", updated1.step)
  const updated2 = updated1.parent || updated1.ambient
  const res = updated2.transitions.reduce(reduceOne, { parent, ambient: updated2, step: updated1.step, maxStep: 0 })
  // console.log("3>>", res.step)
  // console.log("4>>", res.maxStep)
  res.ambient.transitions = []
  if (res.parent) {
    res.parent = replaceChild(res.ambient, res.parent)
  res.step = Math.max(step, res.maxStep)
  }
  return res
}

const hasTransitions = (ambient) => {
  return ambient.transitions.length > 0
    ? true
    : (ambient.children.find(hasTransitions) !== undefined)
}

const reduceFully = (ambient, callback) => {
  let program = { parent: null, ambient: ambient, step: 0 }
  console.log('---- Initial ----')
  let currentTree = ambientTreeToString(program.ambient)
  console.log(currentTree)
  let iteration = 0
  while (true) {
    step = program.step
    program = findTransitions(program.ambient, program.parent)
    if (!hasTransitions(program.ambient)) {
      console.log('--- Reduction done ---')
      break
    }
    // console.log('--- Reductions ------------')
    program.step = step
    program = processTransitions(program.ambient, program.parent, callback, program.step, program.step)
    // console.log()
    // console.log('--- Step', iteration+1, '------------')
    // let newTree = ambientTreeToString(program.ambient, false)
    // console.log(newTree)
    program.step = Math.max(program.step + 1, program.maxStep + 1)
    iteration++
  }
  return program
}

module.exports = {
  findTransitions,
  reduceFully
}
