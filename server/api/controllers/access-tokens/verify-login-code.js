/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /access-tokens/verify-login-code:
 *   post:
 *     summary: Complete an emailed-code login
 *     description: Exchanges a pending token plus the emailed six-digit code for an access token. Terms acceptance and TOTP verification still apply afterwards.
 *     tags:
 *       - Access Tokens
 *     operationId: verifyLoginCode
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pendingToken
 *               - code
 *             properties:
 *               pendingToken:
 *                 type: string
 *                 maxLength: 1024
 *               code:
 *                 type: string
 *                 maxLength: 16
 *               withHttpOnlyToken:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Code verified, access token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   type: string
 *       401:
 *         description: Invalid, expired or exhausted pending token
 *       403:
 *         description: Wrong code, or terms acceptance / TOTP verification required
 *     security: []
 */

const crypto = require('crypto');

const { getRemoteAddress } = require('../../../utils/remote-address');

const { AccessTokenSteps } = require('../../../constants');

const Errors = {
  INVALID_PENDING_TOKEN: {
    invalidPendingToken: 'Invalid pending token',
  },
  INVALID_LOGIN_CODE: {
    invalidLoginCode: 'Invalid login code',
  },
};

module.exports = {
  inputs: {
    pendingToken: {
      type: 'string',
      maxLength: 1024,
      required: true,
    },
    code: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 16,
      required: true,
    },
    withHttpOnlyToken: {
      type: 'boolean',
    },
  },

  exits: {
    invalidPendingToken: {
      responseType: 'unauthorized',
    },
    invalidLoginCode: {
      responseType: 'forbidden',
    },
    termsAcceptanceRequired: {
      responseType: 'forbidden',
    },
    totpVerificationRequired: {
      responseType: 'forbidden',
    },
    adminLoginRequiredToInitializeInstance: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const remoteAddress = getRemoteAddress(this.req);

    let payload;
    try {
      payload = sails.helpers.utils.verifyJwtToken(inputs.pendingToken);
    } catch (error) {
      if (error.raw && error.raw.name === 'TokenExpiredError') {
        throw Errors.INVALID_PENDING_TOKEN;
      }
      sails.log.warn(`Invalid pending token! (IP: ${remoteAddress})`);
      throw Errors.INVALID_PENDING_TOKEN;
    }

    if (payload.subject !== AccessTokenSteps.VERIFY_LOGIN_CODE) {
      throw Errors.INVALID_PENDING_TOKEN;
    }

    const session = await Session.qm.getOneUndeletedByPendingToken(inputs.pendingToken);

    // An unknown email ends up here too: it has a pending token but no session.
    if (!session || !session.loginCodeHash) {
      sails.log.warn(`Invalid pending token! (IP: ${remoteAddress})`);
      throw Errors.INVALID_PENDING_TOKEN;
    }

    const user = await User.qm.getOneById(session.userId, {
      withDeactivated: false,
    });
    if (!user) {
      throw Errors.INVALID_PENDING_TOKEN;
    }

    const expected = Buffer.from(session.loginCodeHash, 'hex');
    const actual = Buffer.from(
      sails.helpers.utils.hashLoginCode(inputs.pendingToken, inputs.code.trim()),
      'hex',
    );

    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      sails.log.warn(`Invalid login code! (IP: ${remoteAddress})`);

      // Incremented in the database, like the TOTP counter, so racing requests
      // cannot each spend the same attempt.
      const queryResult = await sails.sendNativeQuery(
        'UPDATE session SET pending_token_attempts = pending_token_attempts + 1, updated_at = $1 WHERE id = $2 RETURNING pending_token_attempts',
        [new Date().toISOString(), session.id],
      );

      const [row] = queryResult.rows;

      if (row && row.pending_token_attempts >= sails.config.custom.loginCodeMaxAttempts) {
        sails.log.warn(`Login code attempts exhausted, dropping session (IP: ${remoteAddress})`);
        await Session.qm.deleteOneById(session.id);

        throw Errors.INVALID_PENDING_TOKEN;
      }

      throw Errors.INVALID_LOGIN_CODE;
    }

    // Single use: only one of several racing requests can clear the hash.
    const claimResult = await sails.sendNativeQuery(
      'UPDATE session SET login_code_hash = NULL, updated_at = $1 WHERE id = $2 AND login_code_hash IS NOT NULL AND deleted_at IS NULL',
      [new Date().toISOString(), session.id],
    );

    if (claimResult.rowCount === 0) {
      throw Errors.INVALID_PENDING_TOKEN;
    }

    await Session.qm.deleteOneById(session.id);

    return sails.helpers.accessTokens.handleSteps
      .with({
        user,
        remoteAddress,
        request: this.req,
        response: this.res,
        withHttpOnlyToken: inputs.withHttpOnlyToken,
      })
      .intercept('adminLoginRequiredToInitializeInstance', (error) => ({
        adminLoginRequiredToInitializeInstance: error.raw,
      }))
      .intercept('termsAcceptanceRequired', (error) => ({
        termsAcceptanceRequired: error.raw,
      }))
      .intercept('totpVerificationRequired', (error) => ({
        totpVerificationRequired: error.raw,
      }));
  },
};
