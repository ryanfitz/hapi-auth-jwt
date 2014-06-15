// Load modules

var Boom = require('boom');
var Hoek = require('hoek');
var jwt  = require('jsonwebtoken');


// Declare internals

var internals = {};


exports.register = function (plugin, options, next) {

  plugin.auth.scheme('jwt', internals.implementation);
  next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};


internals.implementation = function (server, options) {

  Hoek.assert(options, 'Missing jwt auth strategy options');
  Hoek.assert(options.key, 'Missing required private key in configuration');

  var settings = Hoek.clone(options);

  var scheme = {
    authenticate: function (request, reply) {

      var req = request.raw.req;
      var authorization = req.headers.authorization;
      if (!authorization) {
        return reply(Boom.unauthorized(null, 'Bearer'));
      }

      var parts = authorization.split(/\s+/);

      if (parts[0] &&
          parts[0].toLowerCase() !== 'bearer') {

        return reply(Boom.unauthorized(null, 'Bearer'));
      }

      if (parts.length !== 2) {
        return reply(Boom.badRequest('Bad HTTP authentication header format', 'Bearer'));
      }

      if(parts[1].split('.').length !== 3) {
        return reply(Boom.badRequest('Bad HTTP authentication header format', 'Bearer'));
      }

      var token = parts[1];

      jwt.verify(token, settings.key, function(err, decoded) {
        if(err && err.message === 'jwt expired') {
          return reply(Boom.unauthorized('Expired token received for JSON Web Token validation', 'Bearer'));
        } else if (err) {
          return reply(Boom.unauthorized('Invalid signature received for JSON Web Token validation', 'Bearer'));
        }

        if (!settings.validateFunc) {
          return reply(null, { credentials: decoded });
        }


        settings.validateFunc(decoded, function (err, isValid, credentials) {

          credentials = credentials || null;

          if (err) {
            return reply(err, { credentials: credentials, log: { tags: ['auth', 'jwt'], data: err } });
          }

          if (!isValid) {
            return reply(Boom.unauthorized('Invalid token', 'Bearer'), { credentials: credentials });
          }

          if (!credentials ||
              typeof credentials !== 'object') {

            return reply(Boom.badImplementation('Bad credentials object received for jwt auth validation'), { log: { tags: 'credentials' } });
          }

          // Authenticated

          return reply(null, { credentials: credentials });
        });

      });

    }
  };

  return scheme;
};


