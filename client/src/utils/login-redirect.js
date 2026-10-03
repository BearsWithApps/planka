/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import Config from '../constants/Config';
import Paths from '../constants/Paths';

// Returns the safe in-app path from the `?redirect=` param on the login URL, or null.
export default () => {
  const redirect = new URLSearchParams(window.location.search).get('redirect');

  if (
    redirect &&
    redirect.startsWith(`${Config.BASE_PATH}/`) &&
    !redirect.startsWith('//') &&
    !redirect.startsWith(Paths.LOGIN)
  ) {
    return redirect;
  }

  return null;
};
