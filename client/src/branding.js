const fallback = {
  productName: 'PLANKA',
  productDescription: 'PLANKA is the kanban-style project mastering tool for everyone',
  productLogoUrl: '',
  productCoverUrl: '',
  showPromoBanner: true,
};

const branding = (typeof window !== 'undefined' && window.PLANKA_BRANDING) || fallback;

export const productName = branding.productName || fallback.productName;
export const productDescription = branding.productDescription || fallback.productDescription;
export const productLogoUrl = branding.productLogoUrl || '';
export const productCoverUrl = branding.productCoverUrl || '';
export const showPromoBanner =
  typeof branding.showPromoBanner === 'boolean' ? branding.showPromoBanner : true;
