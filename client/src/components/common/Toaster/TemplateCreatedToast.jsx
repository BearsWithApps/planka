/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Message } from 'semantic-ui-react';
import { TEMPLATE_EMOJI } from '../../../constants/Icons';

const TemplateCreatedToast = React.memo(() => {
  const [t] = useTranslation();

  return (
    <Message visible positive size="tiny">
      <span role="img" aria-hidden="true">
        {TEMPLATE_EMOJI}
      </span>{' '}
      {t('common.templateCreated')}
    </Message>
  );
});

export default TemplateCreatedToast;
