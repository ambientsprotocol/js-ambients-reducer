const assert = require('assert').strict
const fs = require('fs')

const {
  fromJson,
  ambientTreeToString,
  toValue
} = require('../src/ambient')

const {
  findTransitions,
  processTransitions,
  reduceAmbient,
  reduceFully
} = require('../src/reducer')

it('reduces correctly', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument-string.json')
  const bytecodeJson = JSON.parse(file)

  const program = reduceFully(fromJson(bytecodeJson))

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

  const program = reduceFully(fromJson(bytecodeJson))

  const expected = 'helloworld'
  console.log('    value:', toValue(program.ambient))
  assert.equal(toValue(program.ambient), expected)
  assert.equal(program.parent, null)
})

it('reduces to correct int value', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument-int.json')
  const bytecodeJson = JSON.parse(file)

  const program = reduceFully(fromJson(bytecodeJson))

  const expected = 5
  console.log('    value:', toValue(program.ambient))
  assert.equal(toValue(program.ambient), expected)
  assert.equal(program.parent, null)
})

it('reduces to correct array value', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument-array.json')
  const bytecodeJson = JSON.parse(file)

  const program = reduceFully(fromJson(bytecodeJson))

  const expected = [2, 3]
  console.log('    value:', toValue(program.ambient))
  assert.deepEqual(toValue(program.ambient), expected)
  assert.equal(program.parent, null)
})

it('reduces to correct string value - new', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument.json')
  const bytecodeJson = JSON.parse(file)

  const program = reduceFully(fromJson(bytecodeJson))

  const expected = 'helloworld'
  console.log('    value:', toValue(program.ambient))
  assert.equal(toValue(program.ambient), expected)
  assert.equal(program.parent, null)
})

it.only('creates correct transitions', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument-string.json')
  const bytecodeJson = JSON.parse(file)

  let a = findTransitions(fromJson(bytecodeJson), null)
  let transitions = a.ambient.transitions

  assert.equal(transitions.length, 2)
  assert.equal(transitions[0].source.name, '')
  assert.equal(transitions[0].cap.op, 'create')
  assert.equal(transitions[0].target, 'g')
  assert.equal(transitions[1].source.name, '')
  assert.equal(transitions[1].cap.op, 'create')
  assert.equal(transitions[1].target, 'f')

  const onEvent = (event, capability, ambient, step, args) => {
    const {target, source} = args
    console.log(step + " ::", event, target && target.name ? target.name : target, source && source.name ? "(" + source.name + ")" : "(" + source + ")")
  }
  let res = reduceFully(fromJson(bytecodeJson), onEvent)
  const expectedValue = 'helloworld'
  const expectedAmbient = `[]{result:=string[plus[l[string[hello[]]]|r[string[world[]]]]]{in_scope:=in_ (g, pw), fn:=g, x:=create (string), fnresult:=create (string)}}
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
  assert.equal(res.parent, null)
  assert.equal(toValue(res.ambient), expectedValue)
  assert.equal(ambientTreeToString(res.ambient), expectedAmbient)
})
