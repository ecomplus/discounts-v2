// setup server and app options from environment variables
const { GCLOUD_PROJECT, FIREBASE_CONFIG, FUNCTION_REGION, SERVER_FUNCTION_NAME, SERVER_OPERATOR_TOKEN, SERVER_BASE_URI, PKG_NAME, PKG_VERSION } = process.env

let projectId = GCLOUD_PROJECT
if (!projectId && FIREBASE_CONFIG) {
  projectId = JSON.parse(FIREBASE_CONFIG).projectId
}
const region = FUNCTION_REGION || 'us-central1'
const functionName = SERVER_FUNCTION_NAME || 'app'

module.exports = {
  functionName,
  operatorToken: SERVER_OPERATOR_TOKEN,
  baseUri: SERVER_BASE_URI ||
    `https://${region}-${projectId}.cloudfunctions.net/${functionName}`,
  hostingUri: `https://${projectId}.web.app`,
  pkg: {
    name: PKG_NAME,
    version: PKG_VERSION
  }
}
