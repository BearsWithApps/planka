/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form, Message, Modal } from 'semantic-ui-react';
import { Input } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useNestedRef } from '../../../hooks';

import styles from './LoginCodeModal.module.scss';

const sanitizeCode = (value) => value.replace(/\D/g, '').slice(0, 6);

const createMessage = (error) => {
  if (!error) return null;
  if (error.message === 'Invalid login code') {
    return { type: 'error', content: 'common.invalidLoginCode' };
  }
  if (error.message === 'Invalid pending token') {
    return { type: 'error', content: 'common.loginCodeExpired' };
  }
  return { type: 'warning', content: 'common.unknownError' };
};

const LoginCodeModal = React.memo(() => {
  const {
    data: { emailOrUsername },
    isSubmitting: isRequesting,
    loginCodeForm: { isSubmitting, isCancelling, error },
  } = useSelector(selectors.selectAuthenticateForm);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [code, setCode] = useState('');
  const [codeFieldRef, handleCodeFieldRef] = useNestedRef('inputRef');

  const message = useMemo(() => createMessage(error), [error]);

  const handleSubmit = useCallback(() => {
    if (code.length !== 6) {
      if (codeFieldRef.current) codeFieldRef.current.focus();
      return;
    }

    dispatch(entryActions.verifyLoginCode(code));
  }, [dispatch, code, codeFieldRef]);

  const handleCancelClick = useCallback(() => {
    dispatch(entryActions.cancelLoginCode());
  }, [dispatch]);

  const handleResendClick = useCallback(() => {
    setCode('');
    dispatch(entryActions.requestLoginCode(emailOrUsername));
  }, [dispatch, emailOrUsername]);

  const handleCodeChange = useCallback((_, { value }) => {
    setCode(sanitizeCode(value));
  }, []);

  return (
    <Modal open centered size="tiny" closeOnDimmerClick={false} closeOnEscape={false}>
      <Modal.Header>{t('common.loginCode_title')}</Modal.Header>
      <Modal.Content>
        <p className={styles.intro}>
          {t('common.enterLoginCode', {
            email: emailOrUsername,
          })}
        </p>
        {message && (
          <Message
            {...{
              [message.type]: true,
            }}
            content={t(message.content)}
          />
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Field>
            <Input
              fluid
              autoFocus
              ref={handleCodeFieldRef}
              value={code}
              maxLength={6}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              readOnly={isSubmitting}
              className={styles.codeInput}
              onChange={handleCodeChange}
            />
          </Form.Field>
          <button
            type="button"
            className={styles.resend}
            disabled={isSubmitting || isCancelling || isRequesting}
            onClick={handleResendClick}
          >
            {t('action.resendCode')}
          </button>
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button
          content={t('action.cancelAndClose')}
          floated="left"
          loading={isCancelling}
          disabled={isSubmitting || isCancelling}
          onClick={handleCancelClick}
        />
        <Button
          positive
          content={t('action.verify')}
          loading={isSubmitting}
          disabled={isSubmitting || isCancelling || code.length !== 6}
          onClick={handleSubmit}
        />
      </Modal.Actions>
    </Modal>
  );
});

export default LoginCodeModal;
