/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Comment, Loader } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import Item from './Item';

import styles from './RecentChanges.module.scss';

const RecentChanges = React.memo(({ className }) => {
  const { items, isFetching, isFetched, isAllFetched } = useSelector(
    selectors.selectRecentActivities,
  );

  const dispatch = useDispatch();
  const [t] = useTranslation();

  useEffect(() => {
    dispatch(entryActions.fetchRecentActivities());
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    const oldest = items.at(-1);

    if (!oldest) {
      return;
    }

    dispatch(entryActions.fetchRecentActivities(oldest.createdAt.toISOString()));
  }, [items, dispatch]);

  let bodyNode;
  if (!isFetched || (items.length === 0 && isFetching)) {
    bodyNode = <Loader active inline="centered" size="small" />;
  } else if (items.length === 0) {
    bodyNode = <div className={styles.empty}>{t('common.noRecentChanges')}</div>;
  } else {
    bodyNode = (
      <>
        <Comment.Group className={styles.items}>
          {items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </Comment.Group>
        {!isAllFetched && (
          <Button
            basic
            compact
            loading={isFetching}
            disabled={isFetching}
            className={styles.more}
            onClick={handleLoadMore}
          >
            {t('action.showMore')}
          </Button>
        )}
      </>
    );
  }

  return (
    <aside className={classNames(styles.panel, className)}>
      <div className={styles.title}>
        {t('common.recentChanges', {
          context: 'title',
        })}
      </div>
      {bodyNode}
    </aside>
  );
});

RecentChanges.propTypes = {
  className: PropTypes.string,
};

RecentChanges.defaultProps = {
  className: undefined,
};

export default RecentChanges;
