/**
 * This file defines routes for the status / public pages of the site
 */
const express = require('express');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const router = express.Router();
const util = require('util');
const log4js = require('log4js');
const https = require('https');
const http = require('http');
const flash = require('express-flash');
const axios = require('axios');
const config = require('../config.js');
// Logging middleware
const log = log4js.getLogger('secure-routes');
log.level = 'debug';

router.use(flash());

router.get('/myaccountdetails.html', ensureLoggedIn('login.html'), (req, res) => {
  res.render('myaccountdetails');
});

router.get('/mylandingpage.html', ensureLoggedIn('login.html'), (req, res) => {
  res.render('mylandingpage');
});

router.route('/mytransferfunds.html') 
  .get(ensureLoggedIn('login.html'), (req, res) => {
    res.render('mytransferfunds');
  })
  .post(ensureLoggedIn('login.html'), async (req, res, next) => {
    const transfer = req.body;
    log.debug(transfer);
    const username = (req.userContext.userinfo ? req.userContext.userinfo.preferred_username : req.userContext);
    log.debug(`User's preferred_username: ${username}`);
    try {
      const data = {
        verification_prompt: 'Funds Transfer Request',
        appDID: config.oidc.appDID,
        auth_token: config.secrets.writeToken,
        accountName: username,
        requestSummary: 'Secure funds transfer request confirmation from Luvion Bank',
        requestDetails: `Confirm transfer of ${transfer.amount} ${transfer.currency} to ${transfer.recipient}?`,
        nonce: Date.now().toString()
      };

      log.debug(`Sending request to ${config.oidc.apiHost}/auth with the following payload\n${util.inspect(data, false, null, true)}`);
  
      const result = await axios.post(`${config.oidc.apiHost}/auth`, data);
      log.debug(result.data);
  
      var authStatus = result.data.status;
      if (authStatus === 'accepted') {
        log.debug('Authorization successful');
        req.session.save();
        return res.redirect('/mylandingpage.html');
      } else {
        log.debug('Login was not successful: authStatus = ' + authStatus);
        req.flash('info', 'Transaction was not authorized');
        req.session.save();
        return res.redirect('/mytransferfunds.html');
      }
    } catch (err) {
      log.error('Error encoutered while invoking the BlokSec API:');
      if (err.response) {
        // The request was made and the server responded with an error status code
        log.error(err.response.data);
        log.error(err.response.status);
        log.error(err.response.headers);
        if (err.response.status === 404) {
          req.session.save();
          res.redirect('/login/?result=2');
          return;
        } else {
          next(err);
        }
      } else {
        log.error(`Unhandled error: ${err}`);
        next(err);
      }
    }
  });

// Used for parsing the QR code generation response from the BlokSec API server
function parseCode(code, res) {
  const { statusCode } = code;
  const contentType = code.headers['content-type'];

  let error;
  if (statusCode !== 200) {
    error = new Error('Request Failed.\n' +
      `Status Code: ${statusCode}`);
  } else if (!/^image\/png/.test(contentType)) {
    error = new Error('Invalid content-type.\n' +
      `Expected image/png but received ${contentType}`);
  }
  if (error) {
    log.error(error.message);
    // Consume response data to free up memory
    res.status(500).send(error.message);
    return;
  }

  // https://github.com/Automattic/node-canvas/issues/138#issuecomment-194302434
  var chunks = [];
  code.on('data', function (chunk) {
    chunks.push(chunk);
  });

  code.on('end', function () {
    // https://github.com/expressjs/express/issues/732
    res.contentType('image/png');
    res.send(Buffer.concat(chunks));
  });
}

router.get('/registration_qr', (req, res) => {
  const { accountName } = req.query;
  const { issuer, appDID, apiHost } = config.oidc;
  const issuerURL = new URL(issuer);
  const location = issuerURL.protocol + '//' + issuerURL.host;
  const requestString = `${location}/account/qr?appId=${appDID}&accountName=${accountName}&address=${issuerURL.host}`;
  log.debug(`QR code request string: '${requestString}'`);
  try {
    if (issuerURL.protocol === 'https:') {
      https.get(requestString, (code) => {
        parseCode(code, res);
      });
    } else {
      http.get(requestString, (code) => {
        parseCode(code, res);
      });
    }
  } catch (error) {
    log.error(error);
  }
});

router.get('/passwordfree-setup.html', ensureLoggedIn('login.html'), (req, res) => {
  const email = (req.userContext.userinfo ? req.userContext.userinfo.email : req.userContext);
  log.debug(`User's email: ${email}`);
  res.render('passwordfree-setup', {
    email: email
  });
});

module.exports = router;
