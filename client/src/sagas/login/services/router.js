/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select, take } from 'redux-saga/effects';
import { push } from '../../../lib/redux-router';

import selectors from '../../../selectors';
import ActionTypes from '../../../constants/ActionTypes';
import Config from '../../../constants/Config';
import Paths from '../../../constants/Paths';

export function* goTo(pathname) {
  yield put(push(pathname));
}

export function* goToLogin() {
  const { pathname, search } = window.location;
  const target = `${pathname}${search}`;

  if (pathname === Paths.ROOT || pathname === Paths.LOGIN) {
    yield call(goTo, Paths.LOGIN);
    return;
  }

  yield call(goTo, `${Paths.LOGIN}?redirect=${encodeURIComponent(target)}`);
}

export function* goToRoot() {
  yield call(goTo, Paths.ROOT);
}

export function* goToRedirectOrRoot() {
  const redirect = new URLSearchParams(window.location.search).get('redirect');

  if (
    redirect &&
    redirect.startsWith(`${Config.BASE_PATH}/`) &&
    !redirect.startsWith('//') &&
    !redirect.startsWith(Paths.LOGIN)
  ) {
    yield call(goTo, redirect);
    return;
  }

  yield call(goToRoot);
}

export function* handleLocationChange() {
  const pathsMatch = yield select(selectors.selectPathsMatch);

  if (!pathsMatch) {
    return;
  }

  switch (pathsMatch.pattern.path) {
    case Paths.ROOT:
    case Paths.PROJECTS:
    case Paths.BOARDS:
    case Paths.CARDS:
      yield call(goToLogin);

      break;
    default:
  }

  const isInitializing = yield select(selectors.selectIsInitializing);

  if (isInitializing) {
    yield take(ActionTypes.LOGIN_INITIALIZE);
  }

  switch (pathsMatch.pattern.path) {
    default:
  }
}

export default {
  goTo,
  goToLogin,
  goToRoot,
  goToRedirectOrRoot,
  handleLocationChange,
};
