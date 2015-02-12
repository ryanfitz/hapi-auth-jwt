### hapi-auth-jwt

[**hapi**](https://github.com/spumko/hapi) JSON Web Token (JWT) authentication plugin

[![Build Status](https://travis-ci.org/ryanfitz/hapi-auth-jwt.png?branch=master)](https://travis-ci.org/ryanfitz/hapi-auth-jwt)

JSON Web Token authentication requires verifying a signed token. The `'jwt'` scheme takes the following options:

- `key` - (required) Either the private key the token was signed with or a key lookup function with signature `function(token, callback)` where:
    - `token` - the *unverified* encoded jwt token
    - `callback` - a callback function with the signature `function(err, key, extraInfo)` where:
        - `err` - an internal error
        - `key` - the private key that will be used to verify the token
        - `extraInfo` - data that will be passed to `validateFunc` (e.g. credentials)
- `validateFunc` - (optional) validation and user lookup function with the signature `function(token, extraInfo, callback)` where:
    - `token` - the verified and decoded jwt token
    - `extraInfo` - data that was passed from the key lookup function (e.g. credentials)
    - `callback` - a callback function with the signature `function(err, isValid, credentials)` where:
        - `err` - an internal error.
        - `isValid` - `true` if the token was valid otherwise `false`.
        - `credentials` - a credentials object passed back to the application in `request.auth.credentials`. Typically, `credentials` are only included when `isValid` is `true`, but there are cases when the application needs to know who tried to authenticate even when it fails (e.g. with authentication mode `'try'`).

See the example folder for an executable example.

```javascript

var Hapi = require('hapi'),
    jwt = require('jsonwebtoken'),
    server = new Hapi.Server();

server.connection({ port: 8080 });

var accounts = {
    123: {
        id: 123,
        user: 'john',
        fullName: 'John Doe',
        scope: ['a', 'b']
    }
};

var privateKey = 'BbZJjyoXAdr8BUZuiKKARWimKfrSmQ6fv8kZ7OFfc';

// Use this token to build your request with the 'Authorization' header.  
// Ex:
//     Authorization: Bearer <token>
var token = jwt.sign({ accountId: 123 }, privateKey);

var validate = function (decodedToken, extraInfo, callback) {

    var error,
        credentials = accounts[decodedToken.accountId] || {};

    if (!credentials) {
        return callback(error, false, credentials);
    }

    return callback(error, true, credentials)
};

server.register(require('hapi-auth-jwt'), function (error) {

    server.auth.strategy('token', 'jwt', {
        key: privateKey,
        validateFunc: validate
    });

    server.route({
        method: 'GET',
        path: '/',
        config: {
            auth: 'token'
        }
    });

    // With scope requirements
    server.route({
        method: 'GET',
        path: '/withScope',
        config: {
            auth: {
                strategy: 'token',
                scope: ['a']
            }
        }
    });
});

server.start();

```

With a key lookup method:

```javascript

var Hapi = require('hapi'),
    jwt = require('jsonwebtoken'),
    server = new Hapi.Server();

server.connection({ port: 8080 });

var accounts = {
    123: {
        id: 123,
        user: 'john',
        fullName: 'John Doe',
        privateKey: 'BbZJjyoXAdr8BUZuiKKARWimKfrSmQ6fv8kZ7OFfc'
        scope: ['a', 'b']
    }
};

var getKey = function(token, callback) {
  var data = jwt.decode(token);
  var account = accounts[data.id];
  var key = account.privateKey;

  var credentials = {
    id: account.id,
    user: account.user
    fullName: account.fullName,
    scope: account.scope
  }

  callback(null, key, credentials);
}

// Use this token to build your request with the 'Authorization' header.  
// Ex:
//     Authorization: Bearer <token>
var token = jwt.sign({ accountId: 123 }, privateKey);

var validate = function (decodedToken, extraInfo, callback) {

    var error,
        credentials = extraInfo || {};

    if (!credentials) {
        return callback(error, false, credentials);
    }

    return callback(error, true, credentials)
};

server.register(require('hapi-auth-jwt'), function (error) {

    server.auth.strategy('token', 'jwt', {
        key: getKey,
        validateFunc: validate
    });

    server.route({
        method: 'GET',
        path: '/',
        config: {
            auth: 'token'
        }
    });

    // With scope requirements
    server.route({
        method: 'GET',
        path: '/withScope',
        config: {
            auth: {
                strategy: 'token',
                scope: ['a']
            }
        }
    });
});

server.start();

```
