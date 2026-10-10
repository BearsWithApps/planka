/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../../constants/ActionTypes';
import Config from '../../constants/Config';

const initialState = {
  items: [],
  isFetching: false,
  isFetched: false,
  isAllFetched: false,
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.RECENT_ACTIVITIES_FETCH:
      return {
        ...state,
        isFetching: true,
      };
    case ActionTypes.RECENT_ACTIVITIES_FETCH__SUCCESS: {
      const nextItems = payload.before
        ? [
            ...state.items,
            ...payload.items.filter(
              (item) => !state.items.some((existing) => existing.id === item.id),
            ),
          ]
        : payload.items;

      return {
        items: nextItems,
        isFetching: false,
        isFetched: true,
        isAllFetched: payload.items.length < Config.RECENT_ACTIVITIES_LIMIT,
      };
    }
    case ActionTypes.RECENT_ACTIVITIES_FETCH__FAILURE:
      return {
        ...state,
        isFetching: false,
        isFetched: true,
      };
    default:
      return state;
  }
};
