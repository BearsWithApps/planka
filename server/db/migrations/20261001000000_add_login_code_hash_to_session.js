/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Holds the HMAC of an emailed login code on the half-finished login it was
// issued for. Only set on pending sessions created by the email-code flow.

module.exports.up = (knex) =>
  knex.schema.alterTable('session', (table) => {
    table.text('login_code_hash');
  });

module.exports.down = (knex) =>
  knex.schema.alterTable('session', (table) => {
    table.dropColumn('login_code_hash');
  });
