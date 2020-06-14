/* eslint-disable brace-style */
/**
 * This file defines routes for the status / public pages of the site
 */
const express = require('express');
const util = require('util');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('express-flash');
const router = express.Router();
const axios = require('axios');
const log4js = require('log4js');
const config = require('../config.js');

const log = log4js.getLogger('public-routes');
log.level = 'debug';

router.use(flash());

// configure passport.js to use the local strategy
passport.use(new LocalStrategy({
  usernameField: 'username'
}, (username, password, done) => {
  console.log(`${username}, ${password}`);
  if (!username) {
    return done(null, false, {
      message: 'Invalid credentials.'
    });
  }
  if (password !== 'password') {
    return done(null, false, {
      message: 'Invalid credentials.'
    });
  }
  return done(null, username);
}));

// Index / home page route
router.route(['/', 'index.html'])
  .get((req, res) => {
    res.render('index');
  })
  // POST to registration need to call the BlokSec /registration API
  // Sample POST body:
  // {
  //   "auth_token": "59ea3453-185c-4555-92cf-b2a487f50d3d",
  //   "user": {
  //    "name": "Registration User01",
  //    "email": "mike.gillan@gmail.com",
  //    "mobile_number": "+19055550000"
  //   },
  //   "account": {
  //     "name": "registration01@bloksec.com",
  //     "client": "5d9b7f4002d9220011fc6d40"
  //   }
  // }
  .post(async (req, res, next) => {
    log.debug(req.body);

    const data = {
      auth_token: config.secrets.writeToken,
      user: {
        name: req.body.name,
        //name: 'Mike Gillan',
        email: req.body.email,
        //email: 'mike.gillan@gmail.com',
        mobile_number: req.body.mobile,
        //mobile_number: '+19054849941',
      },
      account: {
        name: req.body.email,
        //name: 'mike.gillan_2020030101@gmail.com',
        appId: config.oidc.clientId,
      },
    }

    log.debug(data);
    const result = await axios.post(`${config.oidc.apiHost}/registration`, data);
    log.debug(result);
    res.status(result.status);
    res.send(result.statusText);
  });

router.get('/about.html', (req, res) => {
  res.render('about');
});

router.get('/contact.html', (req, res) => {
  res.render('contact');
});

router.get('/shop.html', (req, res) => {
  res.render('shop');
});

router.get('/men.html', (req, res) => {
  res.render('men');
});

router.get('/mens.html', (req, res) => {
  res.render('mens');
});

router.get('/women.html', (req, res) => {
  res.render('women');
});

router.get('/womens.html', (req, res) => {
  res.render('womens');
});

router.get('/boy.html', (req, res) => {
  res.render('boy');
});

router.get('/boys.html', (req, res) => {
  res.render('boys');
});

router.get('/girl.html', (req, res) => {
  res.render('girl');
});

router.get('/girls.html', (req, res) => {
  res.render('girls');
});

router.post('/checkout.html', (req, res) => {
  res.render('checkout');
});

router.post('/payment.html', (req, res) => {
  res.render('payment');
});

router.route('/login.html')
  .get((req, res) => {
    res.render('login');
  })
  /** Old login config that allows for a username and password */
  // .post((req, res, next) => {
  //   log.debug(`POST /login.html: ${util.inspect(req.body, { showHidden: false, depth: null })}`);
  //   passport.authenticate('local', async (err, user, info) => {
  //     if (info) {
  //       log.debug(`passport authentication failed: ${info}`);
  //       req.flash('info', info);
  //       req.session.save();
  //       return res.redirect('/login.html');
  //     }
  //     if (err) {
  //       return next(err);
  //     }
  //     if (!user) {
  //       log.warn(`passport authentication failed: No user object returned `)
  //       return res.redirect('/login.html');
  //     }
  //     log.debug(`passpord authentication successful - user: ${user}`);
  //     req.session.uid = user;
  //     // Here we need to lookup the user to see if they have BlokSec MFA enabled - call the /account/:clientId/:accountName to check
  //     var response;
  //     try {
  //       log.debug(`Calling PATCH ${config.oidc.apiHost}/account/${config.oidc.clientId}/${req.body.username}`);
  //       const data = {
  //         auth_token: config.secrets.readToken,
  //       };
  //       log.debug(data);
  //       response = await axios.patch(`${config.oidc.apiHost}/account/${config.oidc.clientId}/${req.body.username}`, data);
  //     } catch (error) {
  //       log.error(error.message);
  //       req.flash('info', error);
  //       req.session.save();
  //       return res.redirect('/login.html');
  //     }
  //     if (response && response.data) {
  //       // User exists in BlokSec - render the MFA splash to force them through MFA
  //       log.info(`Found account: ${util.inspect(response.data, { showHidden: false, depth: null })}`);
  //       res.render('mfasplash');
  //     } else {
  //       // user doesn't exist in BlokSec, just log them in
  //       log.info(`No BlokSec account exists for ${req.body.username}, logging them in and redirecting to the landing page`);
  //       req.login(user, (err) => {
  //         if (err) {
  //           return next(err);
  //         }
  //         // Have to save the session manually because Express only invokes it at the end of an HTTP response (which doesn't happen with WebSockets)
  //         // See https://www.npmjs.com/package/express-session#sessionsavecallback
  //         req.session.save();
  //         res.redirect('/mylandingpage.html');
  //       });
  //     }
  //   })(req, res, next);
  // });

router.ws('/interaction/updates', async (ws, req, next) => {
  user = req.session.uid;
  try {
    console.log(`Sending BlokSec MFA request for ${user}`);

    try {
      const data = {
        clientId: config.oidc.clientId,
        accountName: user,
        requestSummary: 'Luvion Authentication Request',
        requestDetails: `Please confirm that you are logging into Luvion as ${user}`,
        nonce: Date.now().toString()
      };

      const result = await axios.post(`${config.oidc.apiHost}/auth`, data);
      console.log(result.data);
      if (!result.data.returnValues) {
        throw 'Empty returnValues from BlokSec API'
      }

      console.log(result.data.returnValues);
      var authCode = result.data.returnValues.authCode;
      if (authCode === '1') {
        console.log('Login successful');
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          if (ws.readyState === ws.CLOSED) {
            // user navigated away or closed their browser, so the interaction will die here
            log.warn(`WS /interaction/updates ${user} > WebSocket session was already closed when authentication event was received, unable to send redirect`);
          } else {
            // Have to save the session manually because Express only invokes it at the end of an HTTP response (which doesn't happen with WebSockets)
            // See https://www.npmjs.com/package/express-session#sessionsavecallback
            req.session.save();
            ws.send('/mylandingpage.html');
            //ws.send(JSON.stringify(event));
          }
        });
      } else {
        console.log('Login was not successful: authCode = ' + authCode);
      }

    } catch (err) {
      console.log('Error encoutered while invoking the BlokSec API:');
      if (err.response) {
        // The request was made and the server responded with an error status code
        console.log(err.response.data);
        console.log(err.response.status);
        console.log(err.response.headers);
        if (err.response.status === 404) {
          req.flash('info', {
            message: 'Invalid credentials.'
          });
          req.session.save();
          ws.send('/login.html');
          return;
        } else {
          next(err);
        }
      } else {
        console.error(`Unhandled error: ${err}`);
        next(err);
      }
    }

    ws.on('close', () => {
      console.log(`WS /interaction/updates (${user}) > WebSocket has been closed`);
      // TODO: if this happens, interrupt the blockchainController because it doesn't need to keep watching
    });

  } catch (err) {
    console.error(`WS /interaction/updates (${user}) > ${util.inspect(err, { showHidden: false, depth: null })}`);
  }

});

module.exports = router;