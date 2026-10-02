/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

// Keyed with the instance secret and bound to the pending token, so a stolen
// hash cannot be ground offline and a code only fits the login it was sent for.

module.exports = {
  sync: true,

  inputs: {
    pendingToken: {
      type: 'string',
      required: true,
    },
    code: {
      type: 'string',
      required: true,
    },
  },

  fn(inputs) {
    return crypto
      .createHmac('sha256', sails.config.session.secret)
      .update(`${inputs.pendingToken}:${inputs.code}`)
      .digest('hex');
  },
};
