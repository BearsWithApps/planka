/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /cards/{id}/create-from-template:
 *   post:
 *     summary: Create card from template
 *     description: Creates a card from a template of the same board, copying its contents, linking it back to the template and adding a comment naming the template. Requires board editor permissions.
 *     tags:
 *       - Cards
 *     operationId: createCardFromTemplate
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the card
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listId
 *               - position
 *             properties:
 *               listId:
 *                 type: string
 *                 description: ID of the list (on the template's board) to create the card in
 *                 example: "1357158568008091266"
 *               position:
 *                 type: number
 *                 minimum: 0
 *                 description: Position for the new card within the list
 *                 example: 65536
 *               name:
 *                 type: string
 *                 maxLength: 1024
 *                 nullable: true
 *                 description: Name for the new card (defaults to the template name)
 *                 example: Implement user authentication
 *     responses:
 *       200:
 *         description: Card created successfully
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
 *                     - comments
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
 *                     comments:
 *                       type: array
 *                       description: Related comments (the "created from" comment)
 *                       items:
 *                         $ref: '#/components/schemas/Comment'
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
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
  CARD_IS_NOT_TEMPLATE: {
    cardIsNotTemplate: 'Card is not a template',
  },
  LIST_MUST_BE_FINITE: {
    listMustBeFinite: 'List must be finite',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    listId: {
      ...idInput,
      required: true,
    },
    position: {
      type: 'number',
      min: 0,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 1024,
      allowNull: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
    listNotFound: {
      responseType: 'notFound',
    },
    cardIsNotTemplate: {
      responseType: 'unprocessableEntity',
    },
    listMustBeFinite: {
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

    if (!card.isTemplate) {
      throw Errors.CARD_IS_NOT_TEMPLATE;
    }

    // Templates are board-scoped: the target list must be on the template's board
    const nextList = await List.qm.getOneById(inputs.listId, {
      boardId: board.id,
    });

    if (!nextList) {
      throw Errors.LIST_NOT_FOUND;
    }

    if (!sails.helpers.lists.isFinite(nextList)) {
      throw Errors.LIST_MUST_BE_FINITE;
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
        list: nextList,
        position: inputs.position,
        name: inputs.name || card.name,
        isTemplate: false,
        sourceTemplateCardId: card.id,
        prevListId: null,
        isClosed: false,
        creatorUser: currentUser,
      },
      request: this.req,
    });

    const comment = await sails.helpers.comments.createOne.with({
      project,
      board,
      list: nextList,
      values: {
        card: nextCard,
        user: currentUser,
        text: `Created from template [${card.name}](${sails.config.custom.baseUrl}/cards/${card.id})`,
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
        comments: [comment],
        attachments: sails.helpers.attachments.presentMany(attachments),
      },
    };
  },
};
