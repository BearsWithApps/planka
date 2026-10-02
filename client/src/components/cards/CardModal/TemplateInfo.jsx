/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Icon } from 'semantic-ui-react';

import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';

import styles from './TemplateInfo.module.scss';

const TemplateInfo = React.memo(({ isTemplate, sourceTemplateCardId }) => {
  const sourceTemplate = useSelector(
    (state) => !!sourceTemplateCardId && selectors.selectCardById(state, sourceTemplateCardId),
  );

  const [t] = useTranslation();

  if (!isTemplate && !sourceTemplateCardId) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <Icon name="clone outline" />
      {isTemplate && t('common.template')}
      {!isTemplate &&
        (sourceTemplate ? (
          <>
            {t('common.fromTemplate')}{' '}
            <Link to={Paths.CARDS.replace(':id', sourceTemplate.id)}>{sourceTemplate.name}</Link>
          </>
        ) : (
          t('common.fromDeletedTemplate')
        ))}
    </div>
  );
});

TemplateInfo.propTypes = {
  isTemplate: PropTypes.bool,
  sourceTemplateCardId: PropTypes.string,
};

TemplateInfo.defaultProps = {
  isTemplate: false,
  sourceTemplateCardId: null,
};

export default TemplateInfo;
