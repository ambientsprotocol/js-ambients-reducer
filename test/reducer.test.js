const assert = require('assert').strict
const fs = require('fs')

const {
  fromJson,
  ambientTreeToString,
  toValue
} = require('../src/ambient')

const {
  reduceAmbient
} = require('../src/reducer')

const reduceToNormalForm = (ambient) => {
  let program = { parent: null, ambient: ambient }
  console.log('---- Initial ----')
  let currentTree = ambientTreeToString(program.ambient)
  console.log(currentTree)
  let iteration = 1
  while (true) {
    program = reduceAmbient(program.ambient, program.parent)
    let newTree = ambientTreeToString(program.ambient)
    if (newTree === currentTree) {
      console.log('--- Reduction done ---')
      break
    }
    console.log('--- Step', iteration++, '------------')
    console.log(newTree)
    currentTree = newTree
  }
  return program
}

it('reduces correctly', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument-string.json')
  const bytecodeJson = JSON.parse(file)

  let program = reduceToNormalForm(fromJson(bytecodeJson))

  const expected =
`[]{result:=string[plus[l[string[hello[]]]|r[string[world[]]]]]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}}
├─ f[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
│  ├─ g[]{in_scope:=in (f, pw), x:=create (string)}
│  └─ string[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
│     └─ plus[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
│        ├─ l[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
│        │  └─ string[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
│        │     └─ hello[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
│        └─ r[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
│           └─ string[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
│              └─ world[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
└─ string[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
   └─ plus[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
      ├─ l[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
      │  └─ string[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
      │     └─ hello[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
      └─ r[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
         └─ string[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
            └─ world[]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}
`

  assert.equal(ambientTreeToString(program.ambient), expected)
  assert.equal(program.parent, null)
})

it('reduces to correct string value', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument-string.json')
  const bytecodeJson = JSON.parse(file)

  let program = reduceToNormalForm(fromJson(bytecodeJson))

  const expected = 'helloworld'
  console.log('    value:', toValue(program.ambient))
  assert.equal(toValue(program.ambient), expected)
  assert.equal(program.parent, null)
})

it('reduces to correct int value', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument-int.json')
  const bytecodeJson = JSON.parse(file)
  let program = reduceToNormalForm(fromJson(bytecodeJson))

  const expected = 5
  console.log('    value:', toValue(program.ambient))
  assert.equal(toValue(program.ambient), expected)
  assert.equal(program.parent, null)
})

it('reduces to correct array value', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument-array.json')
  const bytecodeJson = JSON.parse(file)

  let program = reduceToNormalForm(fromJson(bytecodeJson))

  const expected = [2, 3]
  console.log('    value:', toValue(program.ambient))
  assert.deepEqual(toValue(program.ambient), expected)
  assert.equal(program.parent, null)
})
