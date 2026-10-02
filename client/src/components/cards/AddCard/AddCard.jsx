/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';
import { Button, Form, Icon, TextArea } from 'semantic-ui-react';
import { useClickAwayListener, useDidUpdate, usePrevious, useToggle } from '../../../lib/hooks';
import { Tooltip } from '../../../lib/custom-ui';
import { usePopup } from '../../../lib/popup';

import selectors from '../../../selectors';
import { useClosable, useForm, useNestedRef } from '../../../hooks';
import { isComposing, isModifierKeyPressed } from '../../../utils/event-helpers';
import { CardTypeIcons } from '../../../constants/Icons';
import SelectCardTypeStep from '../SelectCardTypeStep';
import SelectTemplateStep from './SelectTemplateStep';

import styles from './AddCard.module.scss';

const DEFAULT_DATA = {
  name: '',
  templateId: null,
};

const AddCard = React.memo(({ isOpened, className, onCreate, onClose }) => {
  const { defaultCardType: defaultType, limitCardTypesToDefaultOne: limitTypesToDefaultOne } =
    useSelector(selectors.selectCurrentBoard);

  const templateIds = useSelector(selectors.selectTemplateCardIdsForCurrentBoard);
  const withTemplates = !!templateIds && templateIds.length > 0;

  const [t] = useTranslation();
  const prevDefaultType = usePrevious(defaultType);

  const [data, handleFieldChange, setData] = useForm(() => ({
    ...DEFAULT_DATA,
    type: defaultType,
  }));

  const selectedTemplate = useSelector((state) =>
    data.templateId ? selectors.selectCardById(state, data.templateId) : null,
  );

  const [focusNameFieldState, focusNameField] = useToggle();
  const [isClosableActiveRef, activateClosable, deactivateClosable] = useClosable();

  const [nameFieldRef, handleNameFieldRef] = useNestedRef();
  const [submitButtonRef, handleSubmitButtonRef] = useNestedRef();
  const [selectTypeButtonRef, handleSelectTypeButtonRef] = useNestedRef();
  const [selectTemplateButtonRef, handleSelectTemplateButtonRef] = useNestedRef();

  const submit = useCallback(
    (autoOpen) => {
      const { templateId, ...rest } = data;

      // The typed name wins; an empty one falls back to the template's name
      const cleanData = {
        ...rest,
        ...(templateId && { templateId }),
        name: data.name.trim(),
      };

      if (!cleanData.name && !templateId) {
        nameFieldRef.current.select();
        return;
      }

      onCreate(cleanData, autoOpen);

      setData({
        ...DEFAULT_DATA,
        type: defaultType,
      });

      if (autoOpen) {
        onClose();
      } else {
        focusNameField();
      }
    },
    [onCreate, onClose, defaultType, data, setData, focusNameField, nameFieldRef],
  );

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  const handleTypeSelect = useCallback(
    (type) => {
      setData((prevData) => ({
        ...prevData,
        type,
      }));
    },
    [setData],
  );

  const handleTemplateSelect = useCallback(
    (templateId) => {
      setData((prevData) => ({
        ...prevData,
        templateId,
      }));
    },
    [setData],
  );

  const handleTemplateClear = useCallback(() => {
    handleTemplateSelect(null);
    nameFieldRef.current.focus();
  }, [handleTemplateSelect, nameFieldRef]);

  const handleFieldKeyDown = useCallback(
    (event) => {
      if (isComposing(event)) {
        return;
      }

      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          submit(isModifierKeyPressed(event));

          break;
        case 'Escape':
          onClose();

          break;
        default:
      }
    },
    [onClose, submit],
  );

  const handleSelectPopupClose = useCallback(() => {
    deactivateClosable();
    nameFieldRef.current.focus();
  }, [deactivateClosable, nameFieldRef]);

  const handleAwayClick = useCallback(() => {
    if (!isOpened || isClosableActiveRef.current) {
      return;
    }

    onClose();
  }, [isOpened, onClose, isClosableActiveRef]);

  const handleClickAwayCancel = useCallback(() => {
    nameFieldRef.current.focus();
  }, [nameFieldRef]);

  const clickAwayProps = useClickAwayListener(
    [nameFieldRef, submitButtonRef, selectTypeButtonRef, selectTemplateButtonRef],
    handleAwayClick,
    handleClickAwayCancel,
  );

  useEffect(() => {
    if (isOpened) {
      nameFieldRef.current.focus();
    }
  }, [isOpened, nameFieldRef]);

  useEffect(() => {
    if (!isOpened && defaultType !== prevDefaultType) {
      setData((prevData) => ({
        ...prevData,
        type: defaultType,
      }));
    }
  }, [isOpened, defaultType, prevDefaultType, setData]);

  useDidUpdate(() => {
    nameFieldRef.current.focus();
  }, [focusNameFieldState]);

  const SelectCardTypePopup = usePopup(SelectCardTypeStep, {
    onOpen: activateClosable,
    onClose: handleSelectPopupClose,
  });

  const SelectTemplatePopup = usePopup(SelectTemplateStep, {
    onOpen: activateClosable,
    onClose: handleSelectPopupClose,
  });

  return (
    <Form
      className={classNames(className, !isOpened && styles.wrapperClosed)}
      onSubmit={handleSubmit}
    >
      <div className={styles.fieldWrapper}>
        <TextArea
          {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
          ref={handleNameFieldRef}
          as={TextareaAutosize}
          name="name"
          value={data.name}
          placeholder={t('common.enterCardTitle')}
          maxLength={1024}
          minRows={3}
          className={styles.field}
          onKeyDown={handleFieldKeyDown}
          onChange={handleFieldChange}
        />
      </div>
      {selectedTemplate && (
        <div className={styles.templateLine}>
          <Icon name="clone outline" />
          <span className={styles.templateName}>{selectedTemplate.name}</span>
          <button type="button" className={styles.templateClear} onClick={handleTemplateClear}>
            <Icon fitted name="close" />
          </button>
        </div>
      )}
      <div className={styles.controls}>
        <Button
          {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
          positive
          ref={handleSubmitButtonRef}
          content={t('action.addCard')}
          className={styles.button}
        />
        <SelectCardTypePopup defaultValue={data.type} onSelect={handleTypeSelect}>
          <Button
            {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
            ref={handleSelectTypeButtonRef}
            type="button"
            disabled={limitTypesToDefaultOne}
            className={classNames(styles.button, styles.selectTypeButton)}
          >
            <Icon name={CardTypeIcons[data.type]} className={styles.selectTypeButtonIcon} />
            {t(`common.${data.type}`)}
          </Button>
        </SelectCardTypePopup>
        {withTemplates && (
          <SelectTemplatePopup currentId={data.templateId} onSelect={handleTemplateSelect}>
            <Tooltip content={t('common.selectTemplate', { context: 'title' })}>
              <Button
                {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
                ref={handleSelectTemplateButtonRef}
                type="button"
                icon="clone outline"
                className={classNames(
                  styles.button,
                  styles.selectTypeButton,
                  styles.selectTemplateButton,
                )}
              />
            </Tooltip>
          </SelectTemplatePopup>
        )}
      </div>
    </Form>
  );
});

AddCard.propTypes = {
  isOpened: PropTypes.bool,
  className: PropTypes.string,
  onCreate: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

AddCard.defaultProps = {
  isOpened: true,
  className: undefined,
};

export default AddCard;
