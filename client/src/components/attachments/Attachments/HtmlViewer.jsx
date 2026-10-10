/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

import Config from '../../../constants/Config';
import Encodings from '../../../constants/Encodings';
import ContentViewer from './ContentViewer';

import styles from './HtmlViewer.module.scss';

const HtmlViewer = React.memo(({ src, filename, size, encoding, className }) => {
  const [t] = useTranslation();
  const [isSourceVisible, setIsSourceVisible] = useState(false);

  const handleToggleClick = useCallback(() => {
    setIsSourceVisible((prevIsSourceVisible) => !prevIsSourceVisible);
  }, []);

  let content;
  if (!isSourceVisible) {
    content = (
      <iframe
        title={filename}
        src={src}
        sandbox="allow-scripts allow-popups"
        className={styles.frame}
      />
    );
  } else if (encoding === Encodings.UTF8 && size <= Config.MAX_SIZE_TO_DISPLAY_CONTENT) {
    content = <ContentViewer src={src} filename={filename} className={styles.frame} />;
  } else {
    content = (
      <span className={styles.frame}>{t('common.contentOfThisAttachmentIsTooBigToDisplay')}</span>
    );
  }

  return (
    <div className={classNames(styles.wrapper, className)}>
      <button type="button" className={styles.toggle} onClick={handleToggleClick}>
        {isSourceVisible ? t('common.viewRendered') : t('common.viewSource')}
      </button>
      {content}
    </div>
  );
});

HtmlViewer.propTypes = {
  src: PropTypes.string.isRequired,
  filename: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  encoding: PropTypes.string,
  className: PropTypes.string,
};

HtmlViewer.defaultProps = {
  encoding: undefined,
  className: undefined,
};

export default HtmlViewer;
