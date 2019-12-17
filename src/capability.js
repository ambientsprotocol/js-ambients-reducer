const create = (op, args, next) => {
  return { op, args, next }
}

const fromOp = (a) => {
  if (!isValidCapability(a.op) && !isValidCocapability(a.op)) {
    throw new Error(`Invalid capability '${a.op}'`)
  }
  return create(a.op, a.args, a.next.map(fromOp))
}

const toString = (cap) => {
  const caps = cap.args.map(e => typeof e === 'string' ? e : toString(e)).join(', ')
  return `${cap.op} (${caps})`
}

const isValidCapability = (op) => {
  return (op !== 'write' && op !== 'in' && op !== 'read' && op !== 'create' && op !== 'substitute')
}

const isValidCocapability = (op) => {
  return (op !== 'write_' && op !== 'in_' && op !== 'read_')
}

module.exports = {
  create,
  fromOp,
  toString,
  isValidCapability,
  isValidCocapability
}
