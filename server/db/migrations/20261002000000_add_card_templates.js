/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Card templates: a template is an ordinary card flagged `is_template`, parked
// in its board's archive list so list-based code never sees it. A card made
// from a template remembers it in `source_template_card_id` (no foreign key:
// deleting the template leaves the pointer dangling on purpose).
module.exports.up = async (knex) => {
  await knex.schema.alterTable('card', (table) => {
    table.boolean('is_template').notNullable().defaultTo(false);
    table.bigInteger('source_template_card_id');

    table.index('source_template_card_id');
  });
};

module.exports.down = async (knex) => {
  await knex.schema.alterTable('card', (table) => {
    table.dropColumn('source_template_card_id');
    table.dropColumn('is_template');
  });
};
