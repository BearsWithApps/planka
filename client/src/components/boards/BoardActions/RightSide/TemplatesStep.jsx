/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { Popup } from '../../../../lib/custom-ui';
import { push } from '../../../../lib/redux-router';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { useSteps } from '../../../../hooks';
import Paths from '../../../../constants/Paths';
import { BoardMembershipRoles } from '../../../../constants/Enums';
import ConfirmationStep from '../../../common/ConfirmationStep';
import ListsStep from '../../../lists/ListsStep';

import styles from './TemplatesStep.module.scss';

const StepTypes = {
  SELECT_LIST: 'SELECT_LIST',
  DELETE: 'DELETE',
};

const Item = React.memo(({ id, canEdit, onEdit, onCreate, onDelete }) => {
  const card = useSelector((state) => selectors.selectCardById(state, id));

  const [t] = useTranslation();

  const handleEditClick = useCallback(() => {
    onEdit(id);
  }, [id, onEdit]);

  const handleCreateClick = useCallback(() => {
    onCreate(id);
  }, [id, onCreate]);

  const handleDeleteClick = useCallback(() => {
    onDelete(id);
  }, [id, onDelete]);

  return (
    <div className={styles.item}>
      <div className={styles.itemName} title={card.name}>
        {card.name}
      </div>
      <span className={styles.badge}>{t('common.template')}</span>
      {canEdit && (
        <div className={styles.itemActions}>
          <button
            type="button"
            title={t('action.createCardFromTemplate')}
            className={styles.itemAction}
            onClick={handleCreateClick}
          >
            <Icon fitted name="plus" />
          </button>
          <button
            type="button"
            title={t('action.editTemplate')}
            className={styles.itemAction}
            onClick={handleEditClick}
          >
            <Icon fitted name="edit outline" />
          </button>
          <button
            type="button"
            title={t('action.deleteTemplate')}
            className={styles.itemAction}
            onClick={handleDeleteClick}
          >
            <Icon fitted name="trash alternate outline" />
          </button>
        </div>
      )}
    </div>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  canEdit: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const TemplatesStep = React.memo(({ onClose }) => {
  const templateIds = useSelector(selectors.selectTemplateCardIdsForCurrentBoard);

  const canEdit = useSelector((state) => {
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [step, openStep, handleBack] = useSteps();

  const handleEdit = useCallback(
    (id) => {
      dispatch(push(Paths.CARDS.replace(':id', id)));
      onClose();
    },
    [onClose, dispatch],
  );

  const handleCreate = useCallback(
    (id) => {
      openStep(StepTypes.SELECT_LIST, { id });
    },
    [openStep],
  );

  const handleDelete = useCallback(
    (id) => {
      openStep(StepTypes.DELETE, { id });
    },
    [openStep],
  );

  const handleListSelect = useCallback(
    (listId) => {
      dispatch(entryActions.createCardFromTemplate(step.params.id, listId));
      onClose();
    },
    [step, onClose, dispatch],
  );

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteCard(step.params.id));
    handleBack();
  }, [step, handleBack, dispatch]);

  if (step) {
    switch (step.type) {
      case StepTypes.SELECT_LIST:
        return <ListsStep onSelect={handleListSelect} onBack={handleBack} />;
      case StepTypes.DELETE:
        return (
          <ConfirmationStep
            title="common.deleteTemplate"
            content="common.areYouSureYouWantToDeleteThisTemplate"
            buttonContent="action.deleteTemplate"
            onConfirm={handleDeleteConfirm}
            onBack={handleBack}
          />
        );
      default:
    }
  }

  return (
    <>
      <Popup.Header>
        {t('common.templates', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        {templateIds && templateIds.length > 0 ? (
          <div className={styles.items}>
            {templateIds.map((id) => (
              <Item
                key={id}
                id={id}
                canEdit={canEdit}
                onEdit={handleEdit}
                onCreate={handleCreate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>{t('common.noTemplates')}</div>
        )}
      </Popup.Content>
    </>
  );
});

TemplatesStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default TemplatesStep;
