// Load modules

const Boom = require('boom');
const Code = require('code');
const Hapi = require('hapi');
const Jwt = require('jsonwebtoken');
const Lab = require('lab');
const hapiAuthJwt = require('../');
require('./bootstrap');

// Test shortcuts

const lab = (exports.lab = Lab.script());
const before = lab.before;
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

describe('Token', () => {
    const privateKey = 'PajeH0mz4of85T9FB1oFzaB39lbNLbDbtCQ';

    const tokenHeader = (username, options = {}) => `Bearer ${Jwt.sign({ username: username }, privateKey, options)}`;

    const loadUser = (request, decodedToken) => {
        const username = decodedToken.username;

        if (username === 'john') {
            return {
                user: 'john',
                scope: ['a']
            };
        } else if (username === 'jane') {
            throw Boom.badImplementation();
        } else if (username === 'invalid1') {
            return 'bad';
        } else if (username === 'nullman') {
            return null;
        }

        return false;
    };

    const tokenHandler = (request, h) => {
        return 'ok';
    };

    const doubleHandler = async (request, h) => {
        const options = {
            method: 'POST',
            url: '/token',
            headers: { authorization: tokenHeader('john') },
            credentials: request.auth.credentials
        };

        const res = await server.inject(options);
        return res.result;
    };

    const server = new Hapi.Server({ debug: false });

    before(async () => {
        await server.initialize();
        await server.register([hapiAuthJwt]);
        server.auth.strategy('default', 'jwt', {
            key: privateKey,
            validateFunc: loadUser
        });

        server.route([
            {
                method: 'POST',
                path: '/token',
                handler: tokenHandler,
                options: {
                    auth: 'default'
                }
            }
            // {
            //     method: 'POST',
            //     path: '/tokenOptional',
            //     handler: tokenHandler,
            //     options: { access: { mode: 'optional' } }
            // },
            // {
            //     method: 'POST',
            //     path: '/tokenScope',
            //     handler: tokenHandler,
            //     options: { auth: { scope: 'x' } }
            // },
            // {
            //     method: 'POST',
            //     path: '/tokenArrayScope',
            //     handler: tokenHandler,
            //     options: { auth: { scope: ['x', 'y'] } }
            // },
            // {
            //     method: 'POST',
            //     path: '/tokenArrayScopeA',
            //     handler: tokenHandler,
            //     options: { auth: { scope: ['x', 'y', 'a'] } }
            // },
            // { method: 'POST', path: '/double', handler: doubleHandler }
        ]);

        return Promise.resolve();
    });

    it('returns a reply on successful auth', async () => {
        const request = {
            method: 'POST',
            url: '/token',
            headers: { authorization: tokenHeader('john') }
        };

        const res = await server.inject(request);
        expect(res.result).to.exist;
        expect(res.result).to.equal('ok');
    });

    // it('returns a reply on successful auth with audience (aud) and issuer (iss) as options', done => {
    //     const handler = (request, h) => {
    //         expect(request.auth.isAuthenticated).to.equal(true);
    //         expect(request.auth.credentials).to.exist;
    //         return 'ok';
    //     };

    //     const s = new Hapi.Server({ debug: false });
    //     s.connection();
    //     s.register(require('../'), err => {
    //         expect(err).to.not.exist;

    //         s.auth.strategy('default', 'jwt', 'required', {
    //             key: privateKey,
    //             verifyOptions: { audience: 'urn:foo', issuer: 'urn:issuer' }
    //         });

    //         s.route([{ method: 'POST', path: '/token', handler: handler, config: { auth: 'default' } }]);
    //     });

    //     const request = {
    //         method: 'POST',
    //         url: '/token',
    //         headers: {
    //             authorization: tokenHeader('john', { audience: 'urn:foo', issuer: 'urn:issuer' })
    //         }
    //     };

    //     s.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.result).to.equal('ok');
    //         done();
    //     });
    // });

    // it('returns a 401 unauthorized error when algorithm do not match', done => {
    //     const handler = (request, h) => {
    //         reply('ok');
    //     };

    //     const s = new Hapi.Server({ debug: false });
    //     s.connection();
    //     s.register(require('../'), err => {
    //         expect(err).to.not.exist;

    //         s.auth.strategy('default', 'jwt', 'required', {
    //             key: privateKey,
    //             verifyOptions: { algorithms: ['HS512'] }
    //         });

    //         s.route([{ method: 'POST', path: '/token', handler: handler, config: { auth: 'default' } }]);
    //     });

    //     const request = {
    //         method: 'POST',
    //         url: '/token',
    //         headers: { authorization: tokenHeader('john', { algorithm: 'HS256' }) }
    //     };

    //     s.inject(request, res => {
    //         expect(res.statusCode).to.equal(401);
    //         done();
    //     });
    // });

    // it('returns decoded token when no validation  is set', done => {
    //     const handler = (request, h) => {
    //         expect(request.auth.isAuthenticated).to.equal(true);
    //         expect(request.auth.credentials).to.exist;
    //         reply('ok');
    //     };

    //     const server = new Hapi.Server({ debug: false });
    //     server.connection();
    //     server.register(require('../'), err => {
    //         expect(err).to.not.exist;

    //         server.auth.strategy('default', 'jwt', 'required', { key: privateKey });

    //         server.route([{ method: 'POST', path: '/token', handler: handler, config: { auth: 'default' } }]);
    //     });

    //     const request = {
    //         method: 'POST',
    //         url: '/token',
    //         headers: { authorization: tokenHeader('john') }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.result).to.equal('ok');
    //         done();
    //     });
    // });

    // it('returns an error on wrong scheme', done => {
    //     const request = {
    //         method: 'POST',
    //         url: '/token',
    //         headers: { authorization: 'Steve something' }
    //     };

    //     server.inject(request, res => {
    //         expect(res.statusCode).to.equal(401);
    //         done();
    //     });
    // });

    // it('returns a reply on successful double auth', done => {
    //     const request = {
    //         method: 'POST',
    //         url: '/double',
    //         headers: { authorization: tokenHeader('john') }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.result).to.equal('ok');
    //         done();
    //     });
    // });

    // it('returns a reply on failed optional auth', done => {
    //     const request = { method: 'POST', url: '/tokenOptional' };

    //     server.inject(request, res => {
    //         expect(res.result).to.equal('ok');
    //         done();
    //     });
    // });

    // it('returns an error with expired token', done => {
    //     const tenMin = -600;
    //     const request = {
    //         method: 'POST',
    //         url: '/token',
    //         headers: { authorization: tokenHeader('john', { expiresIn: tenMin }) }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result.message).to.equal('Expired token received for JSON Web Token validation');
    //         expect(res.statusCode).to.equal(401);
    //         done();
    //     });
    // });

    // it('returns an error with invalid token', done => {
    //     const token = tokenHeader('john') + '123456123123';

    //     const request = { method: 'POST', url: '/token', headers: { authorization: token } };

    //     server.inject(request, res => {
    //         expect(res.result.message).to.equal('Invalid signature received for JSON Web Token validation');
    //         expect(res.statusCode).to.equal(401);
    //         done();
    //     });
    // });

    // it('returns an error on bad header format', done => {
    //     const request = { method: 'POST', url: '/token', headers: { authorization: 'Bearer' } };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(400);
    //         expect(res.result.isMissing).to.equal(undefined);
    //         done();
    //     });
    // });

    // it('returns an error on bad header format', done => {
    //     const request = { method: 'POST', url: '/token', headers: { authorization: 'bearer' } };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(400);
    //         expect(res.result.isMissing).to.equal(undefined);
    //         done();
    //     });
    // });

    // it('returns an error on bad header internal syntax', done => {
    //     const request = { method: 'POST', url: '/token', headers: { authorization: 'bearer 123' } };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(400);
    //         expect(res.result.isMissing).to.equal(undefined);
    //         done();
    //     });
    // });

    // it('returns an error on unknown user', done => {
    //     const request = {
    //         method: 'POST',
    //         url: '/token',
    //         headers: { authorization: tokenHeader('doe') }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(401);
    //         done();
    //     });
    // });

    // it('returns an error on internal user lookup error', done => {
    //     const request = {
    //         method: 'POST',
    //         url: '/token',
    //         headers: { authorization: tokenHeader('jane') }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(500);
    //         done();
    //     });
    // });

    // it('returns an error on non-object credentials error', done => {
    //     const request = {
    //         method: 'POST',
    //         url: '/token',
    //         headers: { authorization: tokenHeader('invalid1') }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(500);
    //         done();
    //     });
    // });

    // it('returns an error on null credentials error', done => {
    //     const request = {
    //         method: 'POST',
    //         url: '/token',
    //         headers: { authorization: tokenHeader('nullman') }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(500);
    //         done();
    //     });
    // });

    // it('returns an error on insufficient scope', done => {
    //     const request = {
    //         method: 'POST',
    //         url: '/tokenScope',
    //         headers: { authorization: tokenHeader('john') }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(403);
    //         done();
    //     });
    // });

    // it('returns an error on insufficient scope specified as an array', done => {
    //     const request = {
    //         method: 'POST',
    //         url: '/tokenArrayScope',
    //         headers: { authorization: tokenHeader('john') }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(403);
    //         done();
    //     });
    // });

    // it('authenticates scope specified as an array', done => {
    //     const request = {
    //         method: 'POST',
    //         url: '/tokenArrayScopeA',
    //         headers: { authorization: tokenHeader('john') }
    //     };

    //     server.inject(request, res => {
    //         expect(res.result).to.exist;
    //         expect(res.statusCode).to.equal(200);
    //         done();
    //     });
    // });

    // it('cannot add a route that has payload validation required', done => {
    //     const fn = () => {
    //         server.route({
    //             method: 'POST',
    //             path: '/tokenPayload',
    //             handler: tokenHandler,
    //             config: { auth: { mode: 'required', payload: 'required' } }
    //         });
    //     };

    //     expect(fn).to.throw(Error);
    //     done();
    // });
});
