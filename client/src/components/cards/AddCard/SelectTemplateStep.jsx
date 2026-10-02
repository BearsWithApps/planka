/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';

import styles from './SelectTemplateStep.module.scss';

const Item = React.memo(({ id, isActive, onSelect }) => {
  const card = useSelector((state) => selectors.selectCardById(state, id));

  const handleClick = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className={classNames(styles.item, isActive && styles.itemActive)} onClick={handleClick}>
      {card.name}
    </div>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
};

const SelectTemplateStep = React.memo(({ currentId, onSelect, onClose }) => {
  const templateIds = useSelector(selectors.selectTemplateCardIdsForCurrentBoard);

  const [t] = useTranslation();

  const handleSelect = useCallback(
    (id) => {
      onSelect(id);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleClear = useCallback(() => {
    handleSelect(null);
  }, [handleSelect]);

  return (
    <>
      <Popup.Header>
        {t('common.selectTemplate', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                     jsx-a11y/no-static-element-interactions */}
        <div
          className={classNames(styles.item, !currentId && styles.itemActive)}
          onClick={handleClear}
        >
          {t('common.blankCard')}
        </div>
        {(templateIds || []).map((id) => (
          <Item key={id} id={id} isActive={id === currentId} onSelect={handleSelect} />
        ))}
      </Popup.Content>
    </>
  );
});

SelectTemplateStep.propTypes = {
  currentId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

SelectTemplateStep.defaultProps = {
  currentId: undefined,
};

export default SelectTemplateStep;
