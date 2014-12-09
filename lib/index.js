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

      function ReplyOrRedirect(hapiError) {
        if(settings.redirectUrl) {
          return reply.redirect(settings.redirectUrl);
        }
        return reply(hapiError);
      }

      var req = request.raw.req;
      var authorization = req.headers.authorization;
      if (!authorization) {
        return ReplyOrRedirect(Boom.unauthorized(null, 'Bearer'));
      }

      var parts = authorization.split(/\s+/);

      if (parts.length !== 2) {
        return ReplyOrRedirect(Boom.badRequest('Bad HTTP authentication header format', 'Bearer'));
      }

      if (parts[0].toLowerCase() !== 'bearer') {
        return ReplyOrRedirect(Boom.unauthorized(null, 'Bearer'));
      }

      if(parts[1].split('.').length !== 3) {
        return ReplyOrRedirect(Boom.badRequest('Bad HTTP authentication header format', 'Bearer'));
      }

      var token = parts[1];

      jwt.verify(token, settings.key, function(err, decoded) {
        if(err && err.message === 'jwt expired') {
          return ReplyOrRedirect(Boom.unauthorized('Expired token received for JSON Web Token validation', 'Bearer'));
        } else if (err) {
          return ReplyOrRedirect(Boom.unauthorized('Invalid signature received for JSON Web Token validation', 'Bearer'));
        }

        if (!settings.validateFunc) {
          return reply(null, { credentials: decoded });
        }


        settings.validateFunc(decoded, function (err, isValid, credentials) {

          credentials = credentials || null;

          if (err) {
            return ReplyOrRedirect(err, { credentials: credentials, log: { tags: ['auth', 'jwt'], data: err } });
          }

          if (!isValid) {
            return ReplyOrRedirect(Boom.unauthorized('Invalid token', 'Bearer'), { credentials: credentials });
          }

          if (!credentials || typeof credentials !== 'object') {

            return ReplyOrRedirect(Boom.badImplementation('Bad credentials object received for jwt auth validation'), { log: { tags: 'credentials' } });
          }

          // Authenticated

          return reply(null, { credentials: credentials });
        });

      });

    }
  };

  return scheme;
};


