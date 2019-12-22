const stringToAmbient = (s) => {
  return {
    op: "create",
    args: [
      "string"
    ],
    next: [
      {
        op: "create",
        args: [s],
        next: []
      }
    ]
  }
}

const stringValue = (e, toValue) => {
  const concatStrings = (e) => {
    const left = e.children.find(e => e.name === 'l')
    const right = e.children.find(e => e.name === 'r')
    if (!left) throw new Error('Left value not found')
    if (!right) throw new Error('Right value not found')
    const leftValue = stringValue(left.children[0])
    const rightValue =  stringValue(right.children[0].children[0])
    return leftValue + rightValue
  }

  if (e.children[0] && e.children[0].name === 'plus') {
    return concatStrings(e.children[0])
  } else if (e.name === 'plus' && e.children[0]){
    return concatStrings(e)
  } else if (e.name === 'string' && e.children[0]){
    return e.children[0].name
  } else {
    return e.name
  }
}

const intToAmbient = (i) => {
  return {
    op: "create",
    args: [
      "int"
    ],
    next: [
      {
        op: "create",
        args: [i],
        next: []
      }
    ]
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

const arrayToAmbient = (arr, toAmbient) => {
  return 'array[' + arr.reduce((res, acc) => `l[${res}]|r[${toAmbient(acc)}]`, '') + ']'
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
  'string': { decode: stringValue, encode: stringToAmbient },
  'int':  { decode: intValue, encode: intToAmbient },
  'array':  { decode: arrayValue, encode: arrayToAmbient }
}

module.exports = primitiveTypes
