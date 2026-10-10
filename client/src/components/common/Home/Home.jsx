/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';
import { HomeViews } from '../../../constants/Enums';
import GridProjectsView from './GridProjectsView';
import GroupedProjectsView from './GroupedProjectsView';
import RecentChanges from './RecentChanges';

import styles from './Home.module.scss';

const Home = React.memo(() => {
  const view = useSelector(selectors.selectHomeView);

  let View;
  switch (view) {
    case HomeViews.GRID_PROJECTS:
      View = GridProjectsView;

      break;
    case HomeViews.GROUPED_PROJECTS:
      View = GroupedProjectsView;

      break;
    default:
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.layout}>
        <div className={styles.projects}>
          <View />
        </div>
        <RecentChanges className={styles.feed} />
      </div>
    </div>
  );
});

export default Home;
