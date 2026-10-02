/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /cards/{id}/make-template:
 *   post:
 *     summary: Make template from card
 *     description: Copies a card into a new template of the same board (kept in the board archive list, hidden from lists). The original card is untouched. Requires board editor permissions.
 *     tags:
 *       - Cards
 *     operationId: makeTemplateFromCard
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the card
 *         schema:
 *           type: string
 *           example: "1357158568008091264"

 *     responses:
 *       200:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *                 - included
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/Card'
 *                 included:
 *                   type: object
 *                   required:
 *                     - cardMemberships
 *                     - cardLabels
 *                     - taskLists
 *                     - tasks
 *                     - attachments
 *                     - customFieldGroups
 *                     - customFields
 *                     - customFieldValues
 *                   properties:
 *                     cardMemberships:
 *                       type: array
 *                       description: Related card-membership associations
 *                       items:
 *                         $ref: '#/components/schemas/CardMembership'
 *                     cardLabels:
 *                       type: array
 *                       description: Related card-label associations
 *                       items:
 *                         $ref: '#/components/schemas/CardLabel'
 *                     taskLists:
 *                       type: array
 *                       description: Related task lists
 *                       items:
 *                         $ref: '#/components/schemas/TaskList'
 *                     tasks:
 *                       type: array
 *                       description: Related tasks
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     attachments:
 *                       type: array
 *                       description: Related attachments
 *                       items:
 *                         $ref: '#/components/schemas/Attachment'
 *                     customFieldGroups:
 *                       type: array
 *                       description: Related custom field groups
 *                       items:
 *                         $ref: '#/components/schemas/CustomFieldGroup'
 *                     customFields:
 *                       type: array
 *                       description: Related custom fields
 *                       items:
 *                         $ref: '#/components/schemas/CustomField'
 *                     customFieldValues:
 *                       type: array
 *                       description: Related custom field values
 *                       items:
 *                         $ref: '#/components/schemas/CustomFieldValue'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
  ARCHIVE_LIST_NOT_FOUND: {
    archiveListNotFound: 'Archive list not found',
  },
  CARD_ALREADY_TEMPLATE: {
    cardAlreadyTemplate: 'Card is already a template',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
    archiveListNotFound: {
      responseType: 'notFound',
    },
    cardAlreadyTemplate: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { card, list, board, project } = await sails.helpers.cards
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!isProjectManager) {
      if (!boardMembership) {
        throw Errors.CARD_NOT_FOUND; // Forbidden
      }

      if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
        throw Errors.NOT_ENOUGH_RIGHTS;
      }
    }

    if (card.isTemplate) {
      throw Errors.CARD_ALREADY_TEMPLATE;
    }

    const archiveList = await List.qm.getOneArchiveByBoardId(board.id);

    if (!archiveList) {
      throw Errors.ARCHIVE_LIST_NOT_FOUND;
    }

    const {
      card: nextCard,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues,
    } = await sails.helpers.cards.duplicateOne.with({
      project,
      board,
      list,
      record: card,
      values: {
        list: archiveList,
        name: card.name,
        isTemplate: true,
        sourceTemplateCardId: null,
        prevListId: null,
        isClosed: false,
        creatorUser: currentUser,
      },
      request: this.req,
    });

    return {
      item: nextCard,
      included: {
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        customFieldGroups,
        customFields,
        customFieldValues,
        attachments: sails.helpers.attachments.presentMany(attachments),
      },
    };
  },
};
