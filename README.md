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

```javascript
var Hapi = require('hapi');
var jwt = require('jsonwebtoken');

var options = {cors: true};

var server = Hapi.createServer('0.0.0.0', 8080, options);

var privateKey = 'YourApplicationsPrivateKey';

var accounts = {
    123: {
      id: 123,
      user: 'john',
      fullName: 'John Q Public'
    } 
};

var token = jwt.sign({ accountId: 123 }, privateKey);

// use this token to build your web request.  You'll need to add it to the headers as 'authorization'.  And you will need to prefix it with 'Bearer '
console.log('token: ' + token);

var validate = function (decodedToken, callback) {

    console.log(decodedToken);  // should be {accountId : 123}.

    if (decodedToken) {
      console.log(decodedToken.accountId.toString());
    }

    var account = accounts[decodedToken.accountId];
    
    if (!account) {
      return callback(null, false);
    }

    return callback(null, true, account)
};


server.pack.require('hapi-auth-jwt', function (err) {
    
    server.auth.strategy('token', 'jwt', { key: privateKey,  validateFunc: validate });

    server.route({ 
      // GET to http://localhost:8080/tokenRequired
      // with authorization in the request headers set to Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhY2NvdW50SWQiOjEyMywiaWF0IjoxMzkyNTg2NzgwfQ.nZT1lsYoJvudjEYodUdgPR-32NNHk7uSnIHeIHY5se0
      // That is, the text 'Bearer ' + the token. 
      method: 'GET', 
      path: '/tokenRequired', 
      config: { auth: 'token' },
      handler: function(request, reply) {
        var replyObj = {text: 'I am a JSON response, and you needed a token to get me.', credentials: request.auth.credentials};
        reply(replyObj);
      }
    });

    server.route({
      // GET to http://localhost:8080/noTokenRequired
      // This get can be executed without sending any token at all
      method: "GET",
      path: "/noTokenRequired",
      config: { auth: false },
      handler: function(request, reply) {
        var replyObj = {text: 'I am a JSON response, but you did not need a token to get me'};
        reply(replyObj);
      }
    });

});
  

server.start();```
