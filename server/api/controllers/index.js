/*!
 * Copyright (c) 2025 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  exits: {
    success: {
      responseType: 'view',
      viewTemplatePath: 'index',
    },
  },

  fn() {
    const { custom } = sails.config;
    const branding = {
      productName: custom.productName,
      productDescription: custom.productDescription,
      productLogoUrl: custom.productLogoUrl,
      productCoverUrl: custom.productCoverUrl,
      showPromoBanner: custom.showPromoBanner,
    };

    return {
      basePath: custom.baseUrlPath,
      productName: custom.productName,
      productDescription: custom.productDescription,
      brandingJson: JSON.stringify(branding).replace(/</g, '\\u003c'),
    };
  },
};
