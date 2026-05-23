function timestamp() {
  return new Date().toISOString();
}

function info(msg) {
  console.log(`[${timestamp()}] [INFO]  ${msg}`);
}

function warn(msg) {
  console.warn(`[${timestamp()}] [WARN]  ${msg}`);
}

function error(msg) {
  console.error(`[${timestamp()}] [ERROR] ${msg}`);
}

module.exports = { info, warn, error };
