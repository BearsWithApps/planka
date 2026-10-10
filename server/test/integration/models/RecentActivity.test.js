const { expect } = require('chai');

describe('Recent activity queries', () => {
  let originalSendNativeQuery;
  let originalFind;
  let nativeQueryCalls;
  let findCalls;
  let sortCalls;

  beforeEach(() => {
    nativeQueryCalls = [];
    findCalls = [];
    sortCalls = [];
    originalSendNativeQuery = sails.sendNativeQuery;
    originalFind = Action.find;

    sails.sendNativeQuery = async (query, values) => {
      nativeQueryCalls.push({ query, values });
      return { rows: [] };
    };

    const chain = {
      sort(value) {
        sortCalls.push(value);
        return chain;
      },
      limit() {
        return Promise.resolve([]);
      },
    };

    Action.find = (criteria) => {
      findCalls.push(criteria);
      return chain;
    };
  });

  afterEach(() => {
    sails.sendNativeQuery = originalSendNativeQuery;
    Action.find = originalFind;
  });

  describe('Action.qm.getRecentByBoardIds', () => {
    it('does not hit the database without boards', async () => {
      const result = await Action.qm.getRecentByBoardIds([], { limit: 10 });

      expect(result).to.deep.equal([]);
      expect(findCalls).to.have.length(0);
    });

    it('scopes to the given boards, newest first with an id tiebreak', async () => {
      await Action.qm.getRecentByBoardIds(['1', '2'], { limit: 10 });

      expect(findCalls).to.deep.equal([{ boardId: ['1', '2'] }]);
      expect(sortCalls).to.deep.equal([['createdAt DESC', 'id DESC']]);
    });

    it('includes the boundary timestamp when paging', async () => {
      const before = new Date('2026-01-01T00:00:00.000Z');

      await Action.qm.getRecentByBoardIds(['1'], { before, limit: 10 });

      expect(findCalls[0].createdAt).to.deep.equal({ '<=': before });
    });
  });

  describe('Comment.qm.getRecentByBoardIds', () => {
    it('does not hit the database without boards', async () => {
      const result = await Comment.qm.getRecentByBoardIds([], { limit: 10 });

      expect(result).to.deep.equal([]);
      expect(nativeQueryCalls).to.have.length(0);
    });

    it('parameterizes board ids and limit, and skips template cards', async () => {
      await Comment.qm.getRecentByBoardIds(['1', '2'], { limit: 7 });

      expect(nativeQueryCalls).to.have.length(1);

      const { query, values } = nativeQueryCalls[0];

      expect(query).to.include('card.board_id IN ($1, $2)');
      expect(query).to.include('card.is_template = false');
      expect(query).to.include('ORDER BY comment.created_at DESC, comment.id DESC LIMIT $3');
      expect(values).to.deep.equal(['1', '2', 7]);
    });

    it('includes the boundary timestamp when paging', async () => {
      const before = new Date('2026-01-01T00:00:00.000Z');

      await Comment.qm.getRecentByBoardIds(['1'], { before, limit: 7 });

      const { query, values } = nativeQueryCalls[0];

      expect(query).to.include('comment.created_at <= $2');
      expect(values).to.deep.equal(['1', before, 7]);
    });
  });
});
