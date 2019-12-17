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
    return e.children[0].name
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
    return e.children[0].name
  }
}

const arrayValue = (e, toValue) => {
  const arrayIdentity = () => []
  const left = e.children.find(e => e.name === 'l')
  const right = e.children.find(e => e.name === 'r')
  if (!left) throw new Error('Left value not found')
  if (!right) throw new Error('Right value not found')
  const leftValue = toValue(left) || arrayIdentity()
  const rightValue = toValue(right)
  return [...leftValue, rightValue]
}

const primitiveTypes = {
  'string': stringValue,
  'int': intValue,
  'array': arrayValue
}

module.exports = primitiveTypes
