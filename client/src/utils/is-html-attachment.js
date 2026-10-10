/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export default ({ mimeType, filename }) =>
  mimeType === 'text/html' || (!mimeType && /\.html?$/i.test(filename || ''));
