const { BACKEND_API_PATH, BACKEND_BASEURL, FRONTEND_API_PATH } = require('./konstanter');
const { ensureAuthenticated } = require('./utils');
const passport = require('passport');
const express = require('express');
const proxy = require('express-http-proxy');
const { getOnBehalfOfAccessToken } = require('./utils');

const router = express.Router();

const getConfiguredRouter = (azureClient) => {
    router.get(
        '/login',
        passport.authenticate('azureOidc', {
            successRedirect: '/success',
            failureRedirect: '/login',
        })
    );
    router.use(
        '/oauth2/callback',
        passport.authenticate('azureOidc', { failureRedirect: '/login' }),
        (req, res) => {
            res.redirect('/');
        }
    );

    router.use(ensureAuthenticated);

    router.get('/hello', (req, res) => res.send('hello world'));

    router.use(FRONTEND_API_PATH, proxy(
        `${BACKEND_BASEURL}`, {
            proxyReqPathResolver: (req) => {
                return `${BACKEND_API_PATH}${req.url}`;
            },
            proxyReqOptDecorator: (options, req) => {
                return new Promise((resolve, reject) =>
                    getOnBehalfOfAccessToken(azureClient, req).then(
                        (access_token) => {
                            options.headers.Authorization = `Bearer ${access_token}`;
                            resolve(options);
                        },
                        (error) => reject(error)
                    )
                );
            },
        }
    ));

    return router;
};

module.exports = { getConfiguredRouter };