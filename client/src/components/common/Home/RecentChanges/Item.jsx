/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from 'react-router';
import { Comment } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import { isUserStatic } from '../../../../utils/record-helpers';
import Paths from '../../../../constants/Paths';
import { ActivityTypes } from '../../../../constants/Enums';
import { STATIC_USER_BY_ID, StaticUserIds } from '../../../../constants/StaticUsers';
import TimeAgo from '../../TimeAgo';
import UserAvatar from '../../../users/UserAvatar';

import styles from './Item.module.scss';

const listLabel = (list, t) => {
  if (!list) {
    return '';
  }

  return list.name || t(`common.${list.type}`);
};

const Item = React.memo(({ item }) => {
  const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);

  const storedUser = useSelector((state) => selectUserById(state, item.userId ?? null));
  const user = storedUser || STATIC_USER_BY_ID[StaticUserIds.DELETED];

  const [t] = useTranslation();

  const userName = isUserStatic(user)
    ? t(`common.${user.name}`, {
        context: 'title',
      })
    : user.name;

  const cardPath = Paths.CARDS.replace(':id', item.card.id);
  const cardName = item.card.name;
  const boardName = item.board.name;

  const cardLink = (
    <Link to={cardPath} className={styles.cardLink}>
      {cardName}
    </Link>
  );

  const author = <span className={styles.author}>{userName}</span>;

  let contentNode;
  switch (item.type) {
    case ActivityTypes.COMMENT_CARD:
      contentNode = (
        <Trans
          i18nKey="common.cardOnBoardUserCommented"
          values={{
            card: cardName,
            board: boardName,
            user: userName,
            comment: item.text,
          }}
        >
          {cardLink}
          {' on '}
          {boardName}
          {' — '}
          {author}
          {` added a comment: «${item.text}»`}
        </Trans>
      );

      break;
    case ActivityTypes.CREATE_CARD:
      contentNode = (
        <Trans
          i18nKey="common.cardOnBoardUserAddedCard"
          values={{
            card: cardName,
            board: boardName,
            user: userName,
            list: listLabel(item.data && item.data.list, t),
          }}
        >
          {cardLink}
          {' on '}
          {boardName}
          {' — '}
          {author}
          {` added this card to ${listLabel(item.data && item.data.list, t)}`}
        </Trans>
      );

      break;
    case ActivityTypes.MOVE_CARD: {
      const fromList = listLabel(item.data && item.data.fromList, t);
      const toList = listLabel(item.data && item.data.toList, t);

      contentNode = (
        <Trans
          i18nKey="common.cardOnBoardUserMovedCard"
          values={{
            card: cardName,
            board: boardName,
            user: userName,
            fromList,
            toList,
          }}
        >
          {cardLink}
          {' on '}
          {boardName}
          {' — '}
          {author}
          {` moved this card from ${fromList} to ${toList}`}
        </Trans>
      );

      break;
    }
    case ActivityTypes.ADD_MEMBER_TO_CARD:
      contentNode =
        String(user.id) === String(item.data && item.data.user && item.data.user.id) ? (
          <Trans
            i18nKey="common.cardOnBoardUserJoined"
            values={{
              card: cardName,
              board: boardName,
              user: userName,
            }}
          >
            {cardLink}
            {' on '}
            {boardName}
            {' — '}
            {author}
            {' joined this card'}
          </Trans>
        ) : (
          <Trans
            i18nKey="common.cardOnBoardUserAddedUser"
            values={{
              card: cardName,
              board: boardName,
              actorUser: userName,
              addedUser: item.data && item.data.user && item.data.user.name,
            }}
          >
            {cardLink}
            {' on '}
            {boardName}
            {' — '}
            {author}
            {` added ${item.data && item.data.user && item.data.user.name} to this card`}
          </Trans>
        );

      break;
    case ActivityTypes.REMOVE_MEMBER_FROM_CARD:
      contentNode =
        String(user.id) === String(item.data && item.data.user && item.data.user.id) ? (
          <Trans
            i18nKey="common.cardOnBoardUserLeft"
            values={{
              card: cardName,
              board: boardName,
              user: userName,
            }}
          >
            {cardLink}
            {' on '}
            {boardName}
            {' — '}
            {author}
            {' left this card'}
          </Trans>
        ) : (
          <Trans
            i18nKey="common.cardOnBoardUserRemovedUser"
            values={{
              card: cardName,
              board: boardName,
              actorUser: userName,
              removedUser: item.data && item.data.user && item.data.user.name,
            }}
          >
            {cardLink}
            {' on '}
            {boardName}
            {' — '}
            {author}
            {` removed ${item.data && item.data.user && item.data.user.name} from this card`}
          </Trans>
        );

      break;
    case ActivityTypes.COMPLETE_TASK:
      contentNode = (
        <Trans
          i18nKey="common.cardOnBoardUserCompletedTask"
          values={{
            card: cardName,
            board: boardName,
            user: userName,
            task: item.data && item.data.task && item.data.task.name,
          }}
        >
          {cardLink}
          {' on '}
          {boardName}
          {' — '}
          {author}
          {` completed ${item.data && item.data.task && item.data.task.name} on this card`}
        </Trans>
      );

      break;
    case ActivityTypes.UNCOMPLETE_TASK:
      contentNode = (
        <Trans
          i18nKey="common.cardOnBoardUserMarkedTaskIncomplete"
          values={{
            card: cardName,
            board: boardName,
            user: userName,
            task: item.data && item.data.task && item.data.task.name,
          }}
        >
          {cardLink}
          {' on '}
          {boardName}
          {' — '}
          {author}
          {` marked ${item.data && item.data.task && item.data.task.name} incomplete on this card`}
        </Trans>
      );

      break;
    default:
      contentNode = (
        <Trans
          i18nKey="common.cardOnBoardUserUpdated"
          values={{
            card: cardName,
            board: boardName,
            user: userName,
          }}
        >
          {cardLink}
          {' on '}
          {boardName}
          {' — '}
          {author}
          {' updated this card'}
        </Trans>
      );
  }

  return (
    <Comment className={styles.item}>
      <span className={styles.user}>
        <UserAvatar id={user.id} size="small" />
      </span>
      <div className={styles.content}>
        <div className={styles.line}>
          <div className={styles.text}>{contentNode}</div>
          <span className={styles.date}>
            <TimeAgo date={item.createdAt} />
          </span>
        </div>
      </div>
    </Comment>
  );
});

Item.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    createdAt: PropTypes.instanceOf(Date).isRequired,
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
    text: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    data: PropTypes.object,
    card: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }).isRequired,
    board: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default Item;
