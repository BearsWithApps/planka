/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /actions/recent:
 *   get:
 *     summary: Get recent activity
 *     description: Retrieves the latest card actions and comments across boards the current user can access.
 *     tags:
 *       - Actions
 *     operationId: getRecentActions
 *     parameters:
 *       - name: before
 *         in: query
 *         required: false
 *         description: Return items created before this timestamp
 *         schema:
 *           type: string
 *           format: date-time
 *           example: 2024-01-01T00:00:00.000Z
 *     responses:
 *       200:
 *         description: Recent activity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - items
 *                 - included
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 included:
 *                   type: object
 *                   required:
 *                     - users
 *                   properties:
 *                     users:
 *                       type: array
 *                       description: Related users
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

const { mentionMarkupToText } = require('../../../utils/mentions');

const LIMIT = 40;
const COMMENT_TEXT_LENGTH = 140;

const compareRecent = (left, right) => {
  const byTime = new Date(right.createdAt) - new Date(left.createdAt);

  if (byTime !== 0) {
    return byTime;
  }

  if (left.id === right.id) {
    return 0;
  }

  return BigInt(right.id) > BigInt(left.id) ? 1 : -1;
};

const cardNameFrom = (card, snapshot) => (card && card.name) || (snapshot && snapshot.name) || '';

const presentAction = (action, cardById, boardById) => {
  const card = cardById[String(action.cardId)];
  const board = boardById[String(action.boardId)];

  return {
    id: action.id,
    type: action.type,
    createdAt: action.createdAt,
    userId: action.userId,
    card: {
      id: action.cardId,
      name: cardNameFrom(card, action.data && action.data.card),
    },
    board: {
      id: action.boardId,
      name: (board && board.name) || '',
    },
    data: action.data,
  };
};

const presentComment = (comment, cardById, boardById) => {
  const card = cardById[String(comment.cardId)];
  const board = card && boardById[String(card.boardId)];
  const text = _.truncate(mentionMarkupToText(comment.text).replace(/\s+/g, ' ').trim(), {
    length: COMMENT_TEXT_LENGTH,
  });

  return {
    id: comment.id,
    type: 'commentCard',
    createdAt: comment.createdAt,
    userId: comment.userId,
    card: {
      id: comment.cardId,
      name: cardNameFrom(card),
    },
    board: {
      id: card ? card.boardId : null,
      name: (board && board.name) || '',
    },
    text,
  };
};

module.exports = {
  inputs: {
    before: {
      type: 'string',
      custom: (value) => Number.isFinite(Date.parse(value)),
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const before = inputs.before ? new Date(inputs.before) : undefined;

    let sharedProjects;
    let sharedProjectIds;

    const managerProjectIds = await sails.helpers.users.getManagerProjectIds(currentUser.id);
    const fullyVisibleProjectIds = [...managerProjectIds];

    if (currentUser.role === User.Roles.ADMIN) {
      sharedProjects = await Project.qm.getShared({
        exceptIdOrIds: managerProjectIds,
      });

      sharedProjectIds = sails.helpers.utils.mapRecords(sharedProjects);
      fullyVisibleProjectIds.push(...sharedProjectIds);
    }

    const boardMemberships = await BoardMembership.qm.getByUserId(currentUser.id);
    const membershipBoardIds = sails.helpers.utils.mapRecords(boardMemberships, 'boardId');

    const membershipBoards = await Board.qm.getByIds(membershipBoardIds, {
      exceptProjectIdOrIds: fullyVisibleProjectIds,
    });

    const fullyVisibleBoards = await Board.qm.getByProjectIds(fullyVisibleProjectIds);
    const boards = [...fullyVisibleBoards, ...membershipBoards];
    const boardIds = sails.helpers.utils.mapRecords(boards);

    const boardById = boards.reduce(
      (result, board) => ({
        ...result,
        [String(board.id)]: board,
      }),
      {},
    );

    const [actions, comments] = await Promise.all([
      Action.qm.getRecentByBoardIds(boardIds, {
        before,
        limit: LIMIT,
      }),
      Comment.qm.getRecentByBoardIds(boardIds, {
        before,
        limit: LIMIT,
      }),
    ]);

    const cardIds = sails.helpers.utils.mapRecords([...actions, ...comments], 'cardId', true, true);
    const cards = cardIds.length > 0 ? await Card.qm.getByIds(cardIds) : [];
    const cardById = cards.reduce(
      (result, card) => ({
        ...result,
        [String(card.id)]: card,
      }),
      {},
    );

    const items = [
      ...actions.map((action) => presentAction(action, cardById, boardById)),
      ...comments
        .filter((comment) => cardById[String(comment.cardId)])
        .map((comment) => presentComment(comment, cardById, boardById)),
    ]
      .sort(compareRecent)
      .slice(0, LIMIT);

    const userIds = sails.helpers.utils.mapRecords(items, 'userId', true, true);
    const users = await User.qm.getByIds(userIds);

    return {
      items,
      included: {
        users: sails.helpers.users.presentMany(users, currentUser),
      },
    };
  },
};
