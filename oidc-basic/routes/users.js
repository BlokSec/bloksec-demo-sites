const express = require('express');
const router = express.Router();
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

router.get('/', ensureLoggedIn('/'), (req, res) => {
  res.render('users', { user: req.userContext });
});

module.exports = router;
