const assert = require('assert').strict
const fs = require('fs')

const {
  fromJson,
  ambientTreeToString
} = require('../src/ambient')

const {
  reduceAmbient
} = require('../src/reducer')

it('reduces correctly', () => {
  const file = fs.readFileSync('./test/fixtures/001-function-argument.json')
  const bytecodeJson = JSON.parse(file)

  let program = { parent: null, ambient: fromJson(bytecodeJson) }

  console.log('---- Initial ----')
  console.log(ambientTreeToString(program.ambient))

  for (let i = 0; i < 5; i++) {
    program = reduceAmbient(program.ambient, program.parent)
    console.log('--- Step', i + 1, '------------')
    console.log(ambientTreeToString(program.ambient))
  }

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
