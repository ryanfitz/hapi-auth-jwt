// Load modules

const Boom = require('boom');
const Hoek = require('hoek');
const { promisify } = require('util');
const { verify } = require('jsonwebtoken');
const pkg = require('../package.json');

const verifyToken = promisify(verify);

// Declare internals

const internals = {};

module.exports = {
  name: pkg.name,
  version: pkg.version,
  register: async server => await server.auth.scheme('jwt', internals.implementation),
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

      let credentials;
      try {
        credentials = await verifyToken(token, settings.key, settings.verifyOptions);
      } catch (error) {
        if (error && error.message === 'jwt expired') {
          throw Boom.unauthorized('Expired token received for JSON Web Token validation', 'Bearer');
        } else if (error) {
          throw Boom.unauthorized(
            'Invalid signature received for JSON Web Token validation',
            'Bearer',
          );
        }
      }

      if (!settings.validateFunc) {
        return h.authenticated({ credentials });
      }

      try {
        credentials = await settings.validateFunc(request, credentials);
      } catch (error) {
        throw Boom.unauthorized('Error validating token from validate function', 'Bearer');
      }

      if (!credentials) {
        return h.unauthenticated(Boom.unauthorized('Invalid token', 'Bearer'), {
          credentials,
        });
      }

      return h.authenticated({ credentials });
    },
  };

  return scheme;
};
