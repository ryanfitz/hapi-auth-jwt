### hapi-auth-jwt

[**hapi**](https://github.com/spumko/hapi) JSON Web Token (JWT) authentication plugin

[![Build Status](https://secure.travis-ci.org/ryanfitz/hapi-auth-jwt)](http://travis-ci.org/spumko/hapi-auth-jwt)

JSON Web Token authentication requires verifying a signed token. The `'jwt'` scheme takes the following options:

- `key` - (required) The private key the token was signed with.
- `validateFunc` - (optional) a user lookup and password validation function with the signature `function(username, password, callback)` where:
    - `token` - the verified and decoded jwt token
    - `callback` - a callback function with the signature `function(err, isValid, credentials)` where:
        - `err` - an internal error.
        - `isValid` - `true` if both the username was found and the password matched, otherwise `false`.
        - `credentials` - a credentials object passed back to the application in `request.auth.credentials`. Typically, `credentials` are only
          included when `isValid` is `true`, but there are cases when the application needs to know who tried to authenticate even when it fails
          (e.g. with authentication mode `'try'`).

```javascript

var accounts = {
    123: {
      id: 123
      username: 'john',
      name: 'John Doe'
    }
};

var validate = function (token, callback) {

    var account = users[token.accountID];
    if (!user) {
        return callback(null, false);
    }

    callback(err, isValid, {id: account.id, name: account.name });
};

server.pack.require('hapi-auth-jwt', function (err) {
    var privateKey = 'BbZJjyoXAdr8BUZuiKKARWimKfrSmQ6fv8kZ7OFfc';

    server.auth.strategy('token', 'jwt', { key: privatekey,  validateFunc: validate });
    server.route({ method: 'GET', path: '/', config: { auth: 'token' } });
});
```
