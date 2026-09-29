import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
// eslint-disable-next-line import/no-unresolved
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
// eslint-disable-next-line import/no-unresolved
import browserslistToEsbuild from 'browserslist-to-esbuild';

const PROXY_TARGET = process.env.PROXY_TARGET || 'http://localhost:1337';

// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PRODUCT_NAME = 'PLANKA';
const DEFAULT_PRODUCT_DESCRIPTION =
  'PLANKA is the kanban-style project mastering tool for everyone';

const envText = (value, fallback, max = 120) => {
  if (!value) return fallback;

  const cleaned = Array.from(String(value), (char) => {
    const code = char.codePointAt(0);

    return code > 31 && code !== 127 ? char : '';
  })
    .join('')
    .trim();

  return cleaned ? cleaned.slice(0, max) : fallback;
};

const envToHttpUrl = (value) => {
  if (!value) return '';

  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';

    return url.toString();
  } catch (error) {
    return '';
  }
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const brandingFromEnv = (env) => ({
  productName: envText(env.PRODUCT_NAME, DEFAULT_PRODUCT_NAME, 80),
  productDescription: envText(env.PRODUCT_DESCRIPTION, DEFAULT_PRODUCT_DESCRIPTION),
  productLogoUrl: envToHttpUrl(env.PRODUCT_LOGO_URL),
  productCoverUrl: envToHttpUrl(env.PRODUCT_COVER_URL),
  showPromoBanner: env.SHOW_PROMO_BANNER !== 'false',
});

const createEjsTemplate = () => ({
  name: 'create-ejs-template',
  closeBundle() {
    if (process.env.INDEX_FORMAT !== 'ejs') return;

    const distPath = path.resolve(__dirname, 'dist');
    const htmlPath = path.join(distPath, 'index.html');

    if (!fs.existsSync(htmlPath)) return;

    const html = fs.readFileSync(htmlPath, 'utf8');

    const ejs = html
      .replace(/(href|src)="\.\/([^"]+)"/g, '$1="<%- basePath %>/$2"')
      .replace(/<title>[\s\S]*?<\/title>/, '<title><%= productName %></title>')
      .replace(
        /<meta name="description" content="[^"]*"\s*\/?>/,
        '<meta name="description" content="<%= productDescription %>" />',
      )
      .replace(
        '</head>',
        "  <script>window.BASE_PATH = '<%- basePath %>';window.PLANKA_BRANDING = <%- brandingJson %>;</script>\n  </head>",
      );

    fs.writeFileSync(path.join(distPath, 'index.ejs'), ejs);
    fs.unlinkSync(htmlPath);
  },
});

const injectDevBranding = (branding) => ({
  name: 'inject-dev-branding',
  apply: 'serve',
  transformIndexHtml(html) {
    const brandingJson = JSON.stringify(branding).replace(/</g, '\\u003c');

    return html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(branding.productName)}</title>`)
      .replace(
        /<meta name="description" content="[^"]*"\s*\/?>/,
        `<meta name="description" content="${escapeHtml(branding.productDescription)}" />`,
      )
      .replace(
        '</head>',
        `  <script>window.PLANKA_BRANDING = ${brandingJson};</script>\n  </head>`,
      );
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, path.resolve(__dirname, '../server'), '');
  const branding = brandingFromEnv(serverEnv);

  return {
    base: './',
    plugins: [
      commonjs(),
      nodePolyfills({
        include: ['fs', 'path', 'process', 'url'],
      }),
      react(),
      svgr(),
      createEjsTemplate(),
      injectDevBranding(branding),
    ],
    resolve: {
      alias: {
        'source-map-js': 'source-map',
      },
    },
    server: {
      port: 3000,
      open: true,
      // The changelog rendered in the about modal lives at the repository root
      fs: {
        allow: ['..'],
      },
      proxy: {
        '/api': PROXY_TARGET,
        '/socket.io': { target: PROXY_TARGET, ws: true },
      },
    },
    build: {
      target: browserslistToEsbuild(['>0.2%', 'not dead', 'not op_mini all']),
    },
  };
});
