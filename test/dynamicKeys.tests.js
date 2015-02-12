// Load modules

var Lab  = require('lab');
var Hapi = require('hapi');
var Code = require('code');
var Hoek = require('hoek');
var Boom = require('boom');
var jwt  = require('jsonwebtoken');


// Test shortcuts

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var before = lab.before;
var describe = lab.describe;
var it = lab.it;

describe('Dynamic Secret', function () {
  var keys = {
    'john': 'johnkey',
    'jane': 'janekey'
  };

  var info = {
    'john': 'johninfo',
    'jane': 'janeinfo',
  };

  var tokenHeader = function (username, options) {
    if (!keys[username]){
      throw new Error('Invalid user name ' + username + '. Valid options \'john\' or \'jane\'');
    }

    options = options || {};

    return 'Bearer ' + jwt.sign({username: username}, keys[username], options);
  };

  var tokenHandler = function (request, reply) {
    reply(request.auth.credentials.username);
  };

  var getKey = function(token, callback){
    getKey.lastToken = token;
    var data = jwt.decode(token);
    Hoek.nextTick(function(){
      callback(null, keys[data.username], info[data.username]);
    })();
  };

  var validateFunc = function(decoded, extraInfo, callback){
    validateFunc.lastExtraInfo = extraInfo;
    callback(null, true, decoded);
  };

  var errorGetKey = function(token, callback){
    callback(new Error('Failed'));
  };

  var boomErrorGetKey = function(token, callback){
    callback(Boom.forbidden('forbidden'));
  };

  var server = new Hapi.Server({ debug: false });
  server.connection();

  before(function (done) {
    server.register(require('../'), function (err) {
      expect(err).to.not.exist;
      server.auth.strategy('normalError', 'jwt', false, { key: errorGetKey });
      server.auth.strategy('boomError', 'jwt', false, { key: boomErrorGetKey });
      server.auth.strategy('default', 'jwt', false, { key: getKey, validateFunc: validateFunc });
      server.route([
        { method: 'POST', path: '/token', handler: tokenHandler, config: { auth: 'default' } },
        { method: 'POST', path: '/normalError', handler: tokenHandler, config: { auth: 'normalError' } },
        { method: 'POST', path: '/boomError', handler: tokenHandler, config: { auth: 'boomError' } }
      ]);

      done();
    });
  });

  ['jane', 'john'].forEach(function(user){

    it('uses key function passing ' + user + '\'s token if ' + user + ' is user', function (done) {

      var request = { method: 'POST', url: '/token', headers: { authorization: tokenHeader(user) } };

      server.inject(request, function (res) {
        expect(res.result).to.exist;
        expect(res.result).to.equal(user);

        jwt.verify(getKey.lastToken, keys[user], function(err, decoded){
          if (err) { return done(err); }
          expect(decoded.username).to.equal(user);

          done();
        });
      });
    });

    it('uses validateFunc function passing ' + user + '\'s extra info if ' + user + ' is user', function (done) {

      var request = { method: 'POST', url: '/token', headers: { authorization: tokenHeader(user) } };

      server.inject(request, function (res) {
        expect(res.result).to.exist;
        expect(res.result).to.equal(user);

        expect(validateFunc.lastExtraInfo).to.equal(info[user]);
        done();
      });
    });
  });

  it('return 500 if an is error thrown when getting key', function(done){

    var request = { method: 'POST', url: '/normalError', headers: { authorization: tokenHeader('john') } };

    server.inject(request, function (res) {
      expect(res).to.exist;
      expect(res.result.statusCode).to.equal(500);
      expect(res.result.error).to.equal('Internal Server Error');
      expect(res.result.message).to.equal('An internal server error occurred');
      done();
    });
  });

  it('return 403 if an is error thrown when getting key', function(done){

    var request = { method: 'POST', url: '/boomError', headers: { authorization: tokenHeader('john') } };

    server.inject(request, function (res) {
      expect(res).to.exist;
      expect(res.result.statusCode).to.equal(403);
      expect(res.result.error).to.equal('Forbidden');
      expect(res.result.message).to.equal('forbidden');
      done();
    });
  });
});
