// Load modules

var Boom = require('boom');
var Hoek = require('hoek');


// Declare internals

var internals = {};


exports.register = function (plugin, options, next) {

    plugin.auth.scheme('basic', internals.implementation);
    next();
};


internals.implementation = function (server, options) {
    
    Hoek.assert(options, 'Missing basic auth strategy options');
    Hoek.assert(typeof options.validateFunc === 'function', 'options.validateFunc must be a valid function in cookie scheme');

    var settings = Hoek.clone(options);

    var scheme = {
        authenticate: function (request, reply) {

            var req = request.raw.req;
            var authorization = req.headers.authorization;
            if (!authorization) {
                return reply(Boom.unauthorized(null, 'Basic'));
            }

            var parts = authorization.split(/\s+/);

            if (parts[0] &&
                parts[0].toLowerCase() !== 'basic') {

                return reply(Boom.unauthorized(null, 'Basic'));
            }

            if (parts.length !== 2) {
                return reply(Boom.badRequest('Bad HTTP authentication header format', 'Basic'));
            }

            var credentialsParts = new Buffer(parts[1], 'base64').toString().split(':');
            if (credentialsParts.length !== 2) {
                return reply(Boom.badRequest('Bad header internal syntax', 'Basic'));
            }

            var username = credentialsParts[0];
            var password = credentialsParts[1];

            if (!username && !settings.allowEmptyUsername) {
                return reply(Boom.unauthorized('HTTP authentication header missing username', 'Basic'));
            }

            settings.validateFunc(username, password, function (err, isValid, credentials) {

                credentials = credentials || null;

                if (err) {
                    return reply(err, { credentials: credentials, log: { tags: ['auth', 'basic'], data: err } });
                }

                if (!isValid) {
                    return reply(Boom.unauthorized('Bad username or password', 'Basic'), { credentials: credentials });
                }

                if (!credentials ||
                    typeof credentials !== 'object') {

                    return reply(Boom.badImplementation('Bad credentials object received for Basic auth validation'), { log: { tags: 'credentials' } });
                }

                // Authenticated

                return reply(null, { credentials: credentials });
            });
        }
    };

    return scheme;
};


