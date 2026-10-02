/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /access-tokens/request-login-code:
 *   post:
 *     summary: Request an emailed login code
 *     description: Starts a passwordless login. If the email belongs to an active user, a six-digit code is sent to it. The response is identical whether or not the email matches a user.
 *     tags:
 *       - Access Tokens
 *     operationId: requestLoginCode
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 maxLength: 256
 *                 description: Email address of the user
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Pending token to exchange, together with the code, at verify-login-code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   type: object
 *                   required:
 *                     - pendingToken
 *                   properties:
 *                     pendingToken:
 *                       type: string
 *       409:
 *         description: Rate limit exceeded
 *       422:
 *         description: Email login is not available (SMTP is not configured)
 *     security: []
 */

const crypto = require('crypto');
const escapeHtml = require('escape-html');
const validator = require('validator');

const { getRemoteAddress } = require('../../../utils/remote-address');

const { AccessTokenSteps } = require('../../../constants');

const Errors = {
  RATE_LIMIT_EXCEEDED: {
    rateLimitExceeded: 'Rate limit exceeded',
  },
  EMAIL_LOGIN_NOT_AVAILABLE: {
    emailLoginNotAvailable: 'Email login not available',
  },
};

const buildHtml = (code, expiresInMinutes, t) => {
  const { baseUrl, productName } = sails.config.custom;
  const { host } = new URL(baseUrl);

  const link = `<a href="${escapeHtml(`${baseUrl}/login`)}">${escapeHtml(host)}</a>`;
  const intro = escapeHtml(t('Your login code for %s is:', '@@LINK@@')).replace('@@LINK@@', link);

  return `<p><b>${escapeHtml(productName)}</b></p><p>${intro}</p><p style="font-size: 24px; letter-spacing: 4px;"><b>${escapeHtml(code)}</b></p><p>${escapeHtml(
    t(
      'This code expires in %s minutes. If you did not request it, you can ignore this email.',
      String(expiresInMinutes),
    ),
  )}</p>`;
};

module.exports = {
  inputs: {
    email: {
      type: 'string',
      maxLength: 256,
      custom: (value) => validator.isEmail(value),
      required: true,
    },
  },

  exits: {
    rateLimitExceeded: {
      responseType: 'conflict',
    },
    emailLoginNotAvailable: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const remoteAddress = getRemoteAddress(this.req);
    const identifier = inputs.email.trim().toLowerCase();

    // Same two counters as the password login, under their own keys: a code
    // costs an email, so one source must not be able to spray them out.
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, max] of [
      [`login-code:ip:${remoteAddress}`, sails.config.custom.authRateLimitMaxPerIp],
      [
        `login-code:identifier:${sails.helpers.utils.hash(identifier)}`,
        sails.config.custom.authRateLimitMaxPerIdentifier,
      ],
    ]) {
      const { isExceeded } = sails.helpers.utils.checkRateLimit.with({
        key,
        windowSeconds: sails.config.custom.authRateLimitWindow,
        max,
      });

      if (isExceeded) {
        sails.log.warn(`Login code rate limit hit (IP: ${remoteAddress})`);
        throw Errors.RATE_LIMIT_EXCEEDED;
      }
    }

    const { transporter } = await sails.helpers.utils.makeSmtpTransporter();

    if (!transporter) {
      throw Errors.EMAIL_LOGIN_NOT_AVAILABLE;
    }

    const { loginCodeExpiresIn } = sails.config.custom;

    // Issued for every address, known or not, so the response gives nothing away.
    const { token: pendingToken } = sails.helpers.utils.createJwtToken(
      AccessTokenSteps.VERIFY_LOGIN_CODE,
      undefined,
      loginCodeExpiresIn,
    );

    const user = await User.qm.getOneActiveByEmailOrUsername(inputs.email);

    if (!user) {
      sails.log.warn(`Login code requested for unknown email! (IP: ${remoteAddress})`);
      transporter.close();

      return {
        item: {
          pendingToken,
        },
      };
    }

    const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');

    await sails.helpers.sessions.createOne.with({
      values: {
        pendingToken,
        loginCodeHash: sails.helpers.utils.hashLoginCode(pendingToken, code),
        userId: user.id,
        remoteAddress,
        userAgent: this.req.headers['user-agent'],
      },
    });

    const t = sails.helpers.utils.makeTranslator(user.language);

    // Not awaited, so a real address does not answer measurably slower than an
    // unknown one. sendEmail logs its own failures.
    sails.helpers.utils.sendEmail
      .with({
        transporter,
        to: user.email,
        subject: t('Your Login Code'),
        html: buildHtml(code, Math.ceil(loginCodeExpiresIn / 60), t),
      })
      .then(() => transporter.close());

    return {
      item: {
        pendingToken,
      },
    };
  },
};
