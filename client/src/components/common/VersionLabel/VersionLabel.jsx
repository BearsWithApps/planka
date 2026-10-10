import React, { useCallback, useEffect, useState } from 'react';

import styles from './VersionLabel.module.scss';

/* global __BUILD_TIME__, __BUILD_HASH__ */
const buildTime = new Date(__BUILD_TIME__);
const buildHash = __BUILD_HASH__;

const pad = (value) => String(value).padStart(2, '0');

const formatDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatFull = (date) =>
  `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

const formatRelative = (date, now) => {
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (seconds < 60) {
    return 'just now';
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  if (seconds < 604800) {
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return `${Math.floor(seconds / 604800)}w ago`;
};

const VersionLabel = React.memo(() => {
  const [isRelative, setIsRelative] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const handleClick = useCallback(() => {
    setNow(Date.now());
    setIsRelative((value) => !value);
  }, []);

  useEffect(() => {
    if (!isRelative) {
      return undefined;
    }

    const interval = setInterval(() => setNow(Date.now()), 30000);

    return () => clearInterval(interval);
  }, [isRelative]);

  const text = isRelative
    ? formatRelative(buildTime, now)
    : `${formatDate(buildTime)}-${buildHash}`;

  return (
    <button
      type="button"
      className={styles.wrapper}
      title={`${formatFull(buildTime)} (${buildHash}) — click to switch`}
      onClick={handleClick}
    >
      {text}
    </button>
  );
});

export default VersionLabel;
