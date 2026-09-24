/**
 * CommonJS Distribution Entry Point for incivexa
 */

let esmModulePromise = null;

function getModule() {
  if (!esmModulePromise) {
    esmModulePromise = import('../src/index.js');
  }
  return esmModulePromise;
}

const Incivexa = {
  init: (...args) => getModule().then(m => m.init(...args)),
  initTelemetry: (...args) => getModule().then(m => m.initTelemetry(...args)),
  captureException: (...args) => getModule().then(m => m.captureException(...args)),
  captureMessage: (...args) => getModule().then(m => m.captureMessage(...args)),
  captureEvent: (...args) => getModule().then(m => m.captureEvent(...args)),
  flush: (...args) => getModule().then(m => m.flush(...args)),
  close: (...args) => getModule().then(m => m.close(...args)),
  getConfig: () => getModule().then(m => m.getConfig()),
  getClientIp: (...args) => getModule().then(m => m.getClientIp(...args)),
  parseDSN: (...args) => getModule().then(m => m.parseDSN(...args)),
  scrub: (...args) => getModule().then(m => m.scrub(...args)),
  setupGlobalHandlers: (...args) => getModule().then(m => m.setupGlobalHandlers(...args)),

  expressMiddleware: () => {
    return (err, req, res, next) => {
      getModule().then(m => {
        m.expressMiddleware()(err, req, res, next);
      }).catch(() => next(err));
    };
  },

  errorHandler: () => {
    return (err, req, res, next) => {
      getModule().then(m => {
        m.expressMiddleware()(err, req, res, next);
      }).catch(() => next(err));
    };
  },

  autoMonitorMiddleware: (options) => {
    return (req, res, next) => {
      getModule().then(m => {
        m.autoMonitorMiddleware(options)(req, res, next);
      }).catch(() => next());
    };
  },

  requestMiddleware: (options) => {
    return (req, res, next) => {
      getModule().then(m => {
        m.autoMonitorMiddleware(options)(req, res, next);
      }).catch(() => next());
    };
  }
};

module.exports = Incivexa;
module.exports.Incivexa = Incivexa;
module.exports.default = Incivexa;

