/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import orm from '../orm';
import { selectTemplateCardIdsForCurrentBoard } from './boards';
import { ListTypes } from '../constants/Enums';

// Image imports are not transformable under jest
jest.mock('../assets/images/deleted-user.png', () => 'deleted-user.png');

jest.mock('../constants/Config', () => ({ __esModule: true, default: { POSITION_GAP: 65535 } }));

jest.mock('./router', () => ({
  ...jest.requireActual('./router'),
  selectPath: () => ({ boardId: '1' }),
}));

const buildState = () => {
  const session = orm.session(orm.getEmptyState());

  session.Board.create({ id: '1' });
  session.List.create({ id: '10', boardId: '1', type: ListTypes.ACTIVE, position: 1 });
  session.List.create({ id: '11', boardId: '1', type: ListTypes.ARCHIVE, position: null });

  session.Card.create({ id: '100', boardId: '1', listId: '10', position: 1, name: 'Plain' });
  session.Card.create({
    id: '101',
    boardId: '1',
    listId: '11',
    position: null,
    name: 'B template',
    isTemplate: true,
  });
  session.Card.create({
    id: '102',
    boardId: '1',
    listId: '11',
    position: null,
    name: 'A template',
    isTemplate: true,
  });

  return { orm: session.state };
};

describe('card templates', () => {
  test('are hidden from list cards', () => {
    const { List } = orm.session(buildState().orm);

    expect(
      List.withId('11')
        .getCardsQuerySet()
        .toRefArray()
        .map(({ id }) => id),
    ).toEqual([]);

    expect(
      List.withId('10')
        .getCardsQuerySet()
        .toRefArray()
        .map(({ id }) => id),
    ).toEqual(['100']);
  });

  test('are listed by name for the current board', () => {
    const result = selectTemplateCardIdsForCurrentBoard(buildState());

    expect(result).toEqual(['102', '101']);
  });
});
