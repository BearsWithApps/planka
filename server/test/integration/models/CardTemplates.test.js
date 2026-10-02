const { expect } = require('chai');

describe('Card templates', () => {
  let originalSendNativeQuery;
  let originalFind;
  let nativeQueryCalls;
  let findCalls;

  beforeEach(() => {
    nativeQueryCalls = [];
    findCalls = [];
    originalSendNativeQuery = sails.sendNativeQuery;
    originalFind = Card.find;

    sails.sendNativeQuery = async (query, values) => {
      nativeQueryCalls.push({ query, values });
      return { rows: [] };
    };

    const chain = {
      sort() {
        return chain;
      },
      limit() {
        return Promise.resolve([]);
      },
    };

    Card.find = (criteria) => {
      findCalls.push(criteria);
      return chain;
    };
  });

  afterEach(() => {
    sails.sendNativeQuery = originalSendNativeQuery;
    Card.find = originalFind;
  });

  it('excludes templates from the raw SQL branch of getByEndlessListId', async () => {
    await Card.qm.getByEndlessListId('list-1', { search: 'task' });

    expect(nativeQueryCalls).to.have.length(1);
    expect(nativeQueryCalls[0].query).to.include('card.is_template = false');
  });

  it('excludes templates from the Waterline branch of getByEndlessListId', async () => {
    await Card.qm.getByEndlessListId('list-1', {});

    expect(findCalls).to.have.length(1);
    expect(findCalls[0].and).to.deep.include({ isTemplate: false });
  });

  it('finds the templates of a board', async () => {
    await Card.qm.getTemplatesByBoardId('board-1');

    expect(findCalls).to.have.length(1);
    expect(findCalls[0]).to.deep.equal({ boardId: 'board-1', isTemplate: true });
  });
});
