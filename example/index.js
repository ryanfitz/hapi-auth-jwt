var Hapi = require('hapi'),
    jwt = require('jsonwebtoken'),
    server = Hapi.createServer('0.0.0.0', 8080, { cors: true });

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


server.pack.register(require('hapi-auth-jwt'), function (err) {

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
  

server.start();