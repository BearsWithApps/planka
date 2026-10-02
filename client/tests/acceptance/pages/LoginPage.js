import Config from '../Config.js';

export default class LoginPage {
  constructor() {
    this.url = `${Config.BASE_URL}/login`;

    this.emailOrUsernameInputSelector = 'input[name="emailOrUsername"]';
    this.passwordInputSelector = 'input[name="password"]';
    this.logInButtonSelector = 'button.primary';
    this.emailLoginButtonSelector = 'button:has-text("Email me a login code")';
    this.loginCodeInputSelector = 'input[autocomplete="one-time-code"]';
    this.messageSelector = 'div.message > div.content > p';
  }

  async navigate() {
    await page.goto(this.url);
  }

  async login(emailOrUsername, password) {
    await page.fill(this.emailOrUsernameInputSelector, emailOrUsername);
    await page.fill(this.passwordInputSelector, password);
    await page.click(this.logInButtonSelector);
  }

  // The code itself is delivered by email and covered by the server tests, so
  // the bootstrap flag and the request endpoint are stubbed here.
  // eslint-disable-next-line class-methods-use-this
  async enableEmailLogin() {
    await page.route('**/api/bootstrap', async (route) => {
      const response = await route.fetch();
      const body = await response.json();

      await route.fulfill({
        response,
        json: { ...body, item: { ...body.item, isEmailLoginEnabled: true } },
      });
    });

    await page.route('**/api/access-tokens/request-login-code', (route) =>
      route.fulfill({ json: { item: { pendingToken: 'stub' } } }),
    );

    await page.reload();
  }

  async requestLoginCode(email) {
    await page.fill(this.emailOrUsernameInputSelector, email);
    await page.click(this.emailLoginButtonSelector);
  }

  async getMessage() {
    return page.innerText(this.messageSelector);
  }
}
