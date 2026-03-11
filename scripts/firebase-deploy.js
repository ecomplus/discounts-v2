require('dotenv').config()

const fs = require('fs')
const path = require('path')
const {
  FIREBASE_TOKEN,
  SERVER_OPERATOR_TOKEN,
  SERVER_BASE_URI
} = process.env

require('./scripts-minification')

const { name, version } = require('../package.json')
const { project, baseUri } = require('./_constants')
const client = require('firebase-tools')

const envLines = [
  `PKG_VERSION=${version}`,
  `PKG_NAME=${name}`,
  `SERVER_OPERATOR_TOKEN=${SERVER_OPERATOR_TOKEN}`
]
if (SERVER_BASE_URI) {
  envLines.push(`SERVER_BASE_URI=${SERVER_BASE_URI}`)
}
fs.writeFileSync(path.join(__dirname, '../functions/.env'), envLines.join('\n') + '\n')

client.deploy({
    project,
    token: FIREBASE_TOKEN,
    force: true
  })

  .then(() => {
    console.log(
      '\x1b[32m%s\x1b[0m',
      `\nDeployed with success to Firebase project '${project}'`
    )
    console.log(
      '\x1b[35m%s\x1b[0m',
      `\nBase URI: ${baseUri}`
    )
    console.log()
  })

  .catch(err => {
    console.error(err)
    process.exit(1)
  })
