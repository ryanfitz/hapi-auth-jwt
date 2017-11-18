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

  const tokenHeader = (username, options = {}) =>
    `Bearer ${Jwt.sign({ username: username }, privateKey, options)}`;

  const loadUser = (request, decodedToken) => {
    const username = decodedToken.username;

    if (username === 'john') {
      return {
        user: 'john',
        scope: ['a'],
      };
    } else if (username === 'jane') {
      throw Boom.badImplementation();
    } else if (username === 'invalid1') {
      return 'bad';
    } else if (username === 'nullman') {
      return null;
    }

    throw Boom.notFound();
  };

  const tokenHandler = () => {
    return 'ok';
  };

  const doubleHandler = async request => {
    const options = {
      method: 'POST',
      url: '/token',
      headers: { authorization: tokenHeader('john') },
      credentials: request.auth.credentials,
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
      validateFunc: loadUser,
    });

    server.route([
      {
        method: 'POST',
        path: '/token',
        handler: tokenHandler,
        options: {
          auth: 'default',
        },
      },
      {
        method: 'POST',
        path: '/tokenOptional',
        handler: tokenHandler,
        options: {
          auth: {
            strategies: ['default'],
            mode: 'optional',
          },
        },
      },
      {
        method: 'POST',
        path: '/tokenScope',
        handler: tokenHandler,
        options: {
          auth: {
            strategies: ['default'],
            access: {
              scope: 'x',
            },
          },
        },
      },
      {
        method: 'POST',
        path: '/tokenArrayScope',
        handler: tokenHandler,
        options: {
          auth: {
            strategies: ['default'],
            access: {
              scope: ['x', 'y'],
            },
          },
        },
      },
      {
        method: 'POST',
        path: '/tokenArrayScopeA',
        handler: tokenHandler,
        options: {
          auth: {
            strategies: ['default'],
            access: {
              scope: ['x', 'y', 'a'],
            },
          },
        },
      },
      { method: 'POST', path: '/double', handler: doubleHandler },
    ]);

    return Promise.resolve();
  });

  it('returns a reply on successful auth', async () => {
    const request = {
      method: 'POST',
      url: '/token',
      headers: { authorization: tokenHeader('john') },
    };

    const res = await server.inject(request);
    expect(res.result).to.equal('ok');
  });

  it('returns a reply on successful auth with audience (aud) and issuer (iss) as options', async () => {
    const handler = request => {
      expect(request.auth.isAuthenticated).to.equal(true);
      return 'ok';
    };

    const s = new Hapi.Server({ debug: false });
    await s.initialize();

    await s.register([hapiAuthJwt]);
    s.auth.strategy('default', 'jwt', {
      key: privateKey,
      verifyOptions: { audience: 'urn:foo', issuer: 'urn:issuer' },
    });
    s.route([{ method: 'POST', path: '/token', handler: handler, config: { auth: 'default' } }]);

    const request = {
      method: 'POST',
      url: '/token',
      headers: {
        authorization: tokenHeader('john', { audience: 'urn:foo', issuer: 'urn:issuer' }),
      },
    };

    const res = await s.inject(request);
    expect(res.result).to.equal('ok');
  });

  it('returns a 401 unauthorized error when algorithm do not match', async () => {
    const handler = () => {
      return 'ok';
    };

    const s = new Hapi.Server({ debug: false });
    await s.initialize();
    await s.register([hapiAuthJwt]);

    s.auth.strategy('default', 'jwt', {
      key: privateKey,
      verifyOptions: { algorithms: ['HS512'] },
    });

    s.route([{ method: 'POST', path: '/token', handler: handler, options: { auth: 'default' } }]);

    const request = {
      method: 'POST',
      url: '/token',
      headers: { authorization: tokenHeader('john', { algorithm: 'HS256' }) },
    };

    const res = await s.inject(request);
    expect(res.statusCode).to.equal(401);
  });

  it('returns decoded token when no validation  is set', async () => {
    const handler = request => {
      expect(request.auth.isAuthenticated).to.equal(true);
      return 'ok';
    };

    const s = new Hapi.Server({ debug: false });
    await s.initialize();
    await s.register([hapiAuthJwt]);

    s.auth.strategy('default', 'jwt', { key: privateKey });

    s.route([{ method: 'POST', path: '/token', handler: handler, config: { auth: 'default' } }]);

    const request = {
      method: 'POST',
      url: '/token',
      headers: { authorization: tokenHeader('john') },
    };

    const res = await s.inject(request);

    expect(res.result).to.equal('ok');
  });

  it('returns an error on wrong scheme', async () => {
    const request = {
      method: 'POST',
      url: '/token',
      headers: { authorization: 'Steve something' },
    };

    const res = await server.inject(request);
    expect(res.statusCode).to.equal(401);
  });

  it('returns a reply on successful double auth', async () => {
    const request = {
      method: 'POST',
      url: '/double',
      headers: { authorization: tokenHeader('john') },
    };

    const res = await server.inject(request);

    expect(res.result).to.equal('ok');
  });

  it('returns a reply on failed optional auth', async () => {
    const request = { method: 'POST', url: '/tokenOptional' };

    const res = await server.inject(request);

    expect(res.result).to.equal('ok');
  });

  it('returns an error with expired token', async () => {
    const tenMin = -600;
    const request = {
      method: 'POST',
      url: '/token',
      headers: { authorization: tokenHeader('john', { expiresIn: tenMin }) },
    };

    const res = await server.inject(request);
    expect(res.result.message).to.equal('Expired token received for JSON Web Token validation');
    expect(res.statusCode).to.equal(401);
  });

  it('returns an error with invalid token', async () => {
    const token = tokenHeader('john') + '123456123123';

    const request = { method: 'POST', url: '/token', headers: { authorization: token } };

    const res = await server.inject(request);
    expect(res.result.message).to.equal('Invalid signature received for JSON Web Token validation');
    expect(res.statusCode).to.equal(401);
  });

  it('returns an error on bad header format', async () => {
    const request = { method: 'POST', url: '/token', headers: { authorization: 'Bearer' } };

    const res = await server.inject(request);
    expect(res.statusCode).to.equal(400);
    expect(res.result.isMissing).to.equal(undefined);
  });

  it('returns an error on bad header format', async () => {
    const request = { method: 'POST', url: '/token', headers: { authorization: 'bearer' } };

    const res = await server.inject(request);
    expect(res.statusCode).to.equal(400);
    expect(res.result.isMissing).to.equal(undefined);
  });

  it('returns an error on bad header internal syntax', async () => {
    const request = { method: 'POST', url: '/token', headers: { authorization: 'bearer 123' } };

    const res = await server.inject(request);
    expect(res.statusCode).to.equal(400);
    expect(res.result.isMissing).to.equal(undefined);
  });

  it('returns an error on unknown user', async () => {
    const request = {
      method: 'POST',
      url: '/token',
      headers: { authorization: tokenHeader('doe') },
    };

    const res = await server.inject(request);
    expect(res.statusCode).to.equal(401);
  });

  it('returns an error on null credentials error', async () => {
    const request = {
      method: 'POST',
      url: '/token',
      headers: { authorization: tokenHeader('nullman') },
    };

    const res = await server.inject(request);
    expect(res.statusCode).to.equal(500);
  });

  it('returns an error on insufficient scope', async () => {
    const request = {
      method: 'POST',
      url: '/tokenScope',
      headers: { authorization: tokenHeader('john') },
    };

    const res = await server.inject(request);
    expect(res.statusCode).to.equal(403);
  });

  it('returns an error on insufficient scope specified as an array', async () => {
    const request = {
      method: 'POST',
      url: '/tokenArrayScope',
      headers: { authorization: tokenHeader('john') },
    };

    const res = await server.inject(request);
    expect(res.statusCode).to.equal(403);
  });

  it('authenticates scope specified as an array', async () => {
    const request = {
      method: 'POST',
      url: '/tokenArrayScopeA',
      headers: { authorization: tokenHeader('john') },
    };

    const res = await server.inject(request);
    expect(res.statusCode).to.equal(200);
  });

  it('cannot add a route that has payload validation required', done => {
    const fn = () => {
      server.route({
        method: 'POST',
        path: '/tokenPayload',
        handler: tokenHandler,
        options: { auth: { mode: 'required', payload: 'required' } },
      });
    };

    expect(fn).to.throw(Error);
    done();
  });
});
