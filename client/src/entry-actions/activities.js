/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const fetchRecentActivities = (before) => ({
  type: EntryActionTypes.RECENT_ACTIVITIES_FETCH,
  payload: {
    before,
  },
});

const fetchActivitiesInCurrentBoard = () => ({
  type: EntryActionTypes.ACTIVITIES_IN_CURRENT_BOARD_FETCH,
  payload: {},
});

const fetchActivitiesInCurrentCard = () => ({
  type: EntryActionTypes.ACTIVITIES_IN_CURRENT_CARD_FETCH,
  payload: {},
});

const handleActivityCreate = (activity) => ({
  type: EntryActionTypes.ACTIVITY_CREATE_HANDLE,
  payload: {
    activity,
  },
});

export default {
  fetchRecentActivities,
  fetchActivitiesInCurrentBoard,
  fetchActivitiesInCurrentCard,
  handleActivityCreate,
};
