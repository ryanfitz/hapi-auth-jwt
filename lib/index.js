// Load modules

var Boom = require('boom');
var Hoek = require('hoek');
var jwt = require('jsonwebtoken');


// Declare internals

var internals = {};

exports.plugin = {
    pkg: require('../package.json'),
    register: function(server) {

        server.auth.scheme('jwt', internals.implementation);
    }
};




internals.implementation = function(server, options) {

    Hoek.assert(options, 'Missing jwt auth strategy options');
    Hoek.assert(options.key, 'Missing required private key in configuration');
    Hoek.assert(typeof options.validate === 'function', 'options.validate must be a valid function in basic scheme');

    var settings = Hoek.clone(options);
    // settings.verifyOptions = settings.verifyOptions || {};

    var scheme = {
        authenticate: async function(request, h) {


            var authorization = request.headers.authorization;

            if (!authorization) {
                throw Boom.unauthorized(null, 'Bearer', settings.unauthorizedAttributes);
            }

            var parts = authorization.split(/\s+/);

            if (parts[0].toLowerCase() !== 'bearer') {
                throw Boom.unauthorized(null, 'Bearer', settings.unauthorizedAttributes);
            }



            if (parts.length !== 2) {
                return Boom.badRequest('Bad HTTP authentication header format', 'Bearer');
            }


            if (parts[1].split('.').length !== 3) {
                return Boom.badRequest('Bad HTTP authentication header format', 'Bearer');
            }

            var token = parts[1];

            await jwt.verify(token, settings.key, settings.verifyOptions || {})



            let main = (err, decoded, h) => {
                if (err && err.message === 'jwt expired') {
                    return Boom.unauthorized('Expired token received for JSON Web Token validation', 'Bearer');
                } else if (err) {
                    return Boom.unauthorized('Invalid signature received for JSON Web Token validation', 'Bearer');
                }

                if (!settings.validateFunc) {
                    return h.continue({ credentials: decoded });
                }

                const { isValid, credentials, response } = settings.validateFunc(request, decoded, h)
                    .then((isValid, credentials) => {

                        credentials = credentials || null;

                        if (!isValid) {
                            return Boom.unauthorized('Invalid token', 'Bearer'), null, { credentials: credentials };
                        }

                        if (!credentials || typeof credentials !== 'object') {

                            return Boom.badImplementation('Bad credentials object received for jwt auth validation'), null, { log: { tags: 'credentials' } };
                        }

                        // Authenticated

                        return h.continue({ credentials: credentials });


                    })
                    .catch((err) => {
                        return h.response(err, null, { credentials: credentials });
                    })


            }

            return h.continue

        }
    };

    return scheme;
};