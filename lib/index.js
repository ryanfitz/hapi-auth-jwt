// Load modules

const Boom = require('boom');
const Hoek = require('hoek');
const jwt = require('jsonwebtoken');
const pkg = require('../package.json');

// Declare internals

const internals = {};

module.exports = {
  name: pkg.name,
  version: pkg.version,
  register: async (server, options) => {
    await server.auth.scheme('jwt', internals.implementation);
  },
};

internals.implementation = (server, options) => {
  Hoek.assert(options, 'Missing jwt auth strategy options');
  Hoek.assert(options.key, 'Missing required private key in configuration');

  const settings = Hoek.clone(options);
  settings.verifyOptions = settings.verifyOptions || {};

  const scheme = {
    authenticate: async (request, h) => {
      const { req } = request.raw;
      const { authorization } = req.headers;
      if (!authorization) {
        throw Boom.unauthorized(null, 'Bearer');
      }

      const parts = authorization.split(/\s+/);

      if (parts.length !== 2) {
        throw Boom.badRequest('Bad HTTP authentication header format', 'Bearer');
      }

      if (parts[0].toLowerCase() !== 'bearer') {
        throw Boom.unauthorized(null, 'Bearer');
      }

      if (parts[1].split('.').length !== 3) {
        throw Boom.badRequest('Bad HTTP authentication header format', 'Bearer');
      }

      const token = parts[1];

      jwt.verify(token, settings.key, settings.verifyOptions || {}, (err, decoded) => {
        if (err && err.message === 'jwt expired') {
          throw Boom.unauthorized('Expired token received for JSON Web Token validation', 'Bearer');
        } else if (err) {
          throw Boom.unauthorized(
            'Invalid signature received for JSON Web Token validation',
            'Bearer',
          );
        }

        if (!settings.validateFunc) {
          return h.authenticated({ credentials: decoded });
        }

        settings.validateFunc(request, decoded, (err, isValid, credentials) => {
          credentials = credentials || null;

          if (err) {
            return h.unauthenticated(err, { credentials: credentials });
          }

          if (!isValid) {
            return h.unauthenticated(Boom.unauthorized('Invalid token', 'Bearer'), {
              credentials: credentials,
            });
          }

          if (!credentials || typeof credentials !== 'object') {
            return h.unauthenticated(
              Boom.badImplementation('Bad credentials object received for jwt auth validation'),
              { log: { tags: 'credentials' } },
            );
          }

          // Authenticated

          return h.authenticated({ credentials: credentials });
        });
      });
    },
  };

  return scheme;
};
