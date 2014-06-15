### hapi-auth-jwt

[**hapi**](https://github.com/spumko/hapi) JSON Web Token (JWT) authentication plugin

[![Build Status](https://travis-ci.org/ryanfitz/hapi-auth-jwt.png?branch=master)](https://travis-ci.org/ryanfitz/hapi-auth-jwt)

JSON Web Token authentication requires verifying a signed token. The `'jwt'` scheme takes the following options:

- `key` - (required) The private key the token was signed with.
- `validateFunc` - (optional) validation and user lookup function with the signature `function(token, callback)` where:
    - `token` - the verified and decoded jwt token
    - `callback` - a callback function with the signature `function(err, isValid, credentials)` where:
        - `err` - an internal error.
        - `isValid` - `true` if the token was valid otherwise `false`.
        - `credentials` - a credentials object passed back to the application in `request.auth.credentials`. Typically, `credentials` are only
          included when `isValid` is `true`, but there are cases when the application needs to know who tried to authenticate even when it fails
          (e.g. with authentication mode `'try'`).

See the example folder for an executable example.

```javascript

var accounts = {
    123: {
      id: 123,
      user: 'john',
      name: 'John Doe',
      scope: ['a', 'b']
    }
};

var validate = function (decodedToken, callback) {

    var account = accounts[decodedToken.accountID];
    if (!account) {
        return callback(null, false);
    }

    callback(err, isValid, {id: account.id, name: account.name });
};

server.pack.register(require('hapi-auth-jwt'), function (err) {
    var privateKey = 'BbZJjyoXAdr8BUZuiKKARWimKfrSmQ6fv8kZ7OFfc';

    server.auth.strategy('token', 'jwt', { key: privatekey,  validateFunc: validate });
    server.route({ method: 'GET', path: '/', config: { auth: 'token' } });
});
```
