const capabilities = ['write', 'in', 'read', 'create', 'substitute']
const cocapabilities = ['write_', 'in_', 'read_']
const atomicOps = ['create', 'substitute']

const create = (op, args, next) => {
  return { op, args, next }
}

const fromOp = (a) => {
  if (!isValid(a)) {
    throw new Error(`Invalid capability '${a.op}'`)
  }
  return create(a.op, a.args, a.next.map(fromOp))
}

const toString = (cap) => {
  const caps = cap.args.map(e => typeof e === 'string' ? e : toString(e)).join(', ')
  return `${cap.op} (${caps})`
}

const isValid = (op) => isValidCapability(op) || isValidCocapability(op)
const isValidCapability = (e) => capabilities.find(op => op === e.op) !== undefined
const isValidCocapability = (e) => cocapabilities.find(op => op === e.op) !== undefined
const isAtomic = (e) => atomicOps.find(op => op === e.op)

module.exports = {
  atomicOps,
  create,
  fromOp,
  toString,
  isValid,
  isValidCapability,
  isValidCocapability,
  isAtomic
}
