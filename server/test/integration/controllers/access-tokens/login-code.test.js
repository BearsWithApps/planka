const { expect } = require('chai');
const request = require('supertest');
const bcrypt = require('bcrypt');

const { AccessTokenSteps } = require('../../../../constants');

const EMAIL = 'login-code@test.test';

describe('access-tokens login code (controller)', () => {
  let originalSendEmail;
  let originalSmtpHost;
  let originalBaseUrl;
  let sent;
  let user;

  const agent = () => request(sails.hooks.http.app);

  const requestCode = (email) =>
    agent().post('/api/access-tokens/request-login-code').send({ email });

  const verifyCode = (pendingToken, code) =>
    agent().post('/api/access-tokens/verify-login-code').send({ pendingToken, code });

  const lastCode = () => /<b>(\d{6})<\/b>/.exec(sent[sent.length - 1].html)[1];

  before(async function beforeCallback() {
    // The default test datastore is in-memory sails-disk, which cannot run the
    // native queries login uses. Run against Postgres to exercise this suite:
    //   sails_datastores__default__adapter=sails-postgresql npm test
    if (sails.config.datastores.default.adapter !== 'sails-postgresql') {
      this.skip();
    }

    originalSendEmail = sails.helpers.utils.sendEmail;
    originalSmtpHost = sails.config.custom.smtpHost;
    originalBaseUrl = sails.config.custom.baseUrl;

    sails.config.custom.smtpHost = 'smtp.test';
    sails.config.custom.baseUrl = 'https://tasks.example.test';
    sails.config.custom.authRateLimitMaxPerIp = 1000;
    sails.config.custom.authRateLimitMaxPerIdentifier = 1000;

    sails.helpers.utils.sendEmail = {
      with: async (values) => {
        sent.push(values);
      },
    };

    await InternalConfig.qm.updateOneMain({ isInitialized: true });

    user = await User.qm.createOne({
      email: EMAIL,
      password: await bcrypt.hash('test', 4),
      role: User.Roles.ADMIN,
      name: 'Login Code',
    });
  });

  beforeEach(() => {
    sent = [];
  });

  after(async () => {
    if (!user) {
      return;
    }

    sails.helpers.utils.sendEmail = originalSendEmail;
    sails.config.custom.smtpHost = originalSmtpHost;
    sails.config.custom.baseUrl = originalBaseUrl;

    await Session.destroy({ userId: user.id });
    await User.destroy({ id: user.id });
  });

  it('emails a code that logs the user in, linking to the configured base URL', async () => {
    const res = await requestCode(EMAIL).expect(200);

    expect(sent).to.have.lengthOf(1);
    expect(sent[0].to).to.equal(EMAIL);
    expect(sent[0].html).to.contain('https://tasks.example.test/login');

    const code = lastCode();
    const verified = await verifyCode(res.body.item.pendingToken, code);

    // Terms may still be pending for a fresh test user; either way the code was accepted.
    expect([200, 403]).to.include(verified.status);
    if (verified.status === 200) {
      expect(verified.body.item).to.be.a('string');
    } else {
      expect(verified.body.message).to.equal('Terms acceptance required');
    }
  });

  it('returns the same shape for an unknown email, sends nothing, and can never verify', async () => {
    const known = await requestCode(EMAIL).expect(200);
    sent = [];
    const unknown = await requestCode('nobody@test.test').expect(200);

    expect(sent).to.have.lengthOf(0);
    expect(Object.keys(unknown.body)).to.deep.equal(Object.keys(known.body));
    expect(Object.keys(unknown.body.item)).to.deep.equal(['pendingToken']);

    await verifyCode(unknown.body.item.pendingToken, '123456').expect(401);
  });

  it('drops the session after too many wrong codes', async () => {
    const res = await requestCode(EMAIL).expect(200);
    const { pendingToken } = res.body.item;
    const code = lastCode();
    const wrong = code === '000000' ? '000001' : '000000';

    const max = sails.config.custom.loginCodeMaxAttempts;

    for (let i = 0; i < max - 1; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await verifyCode(pendingToken, wrong).expect(403);
    }

    await verifyCode(pendingToken, wrong).expect(401);
    await verifyCode(pendingToken, code).expect(401);
  });

  it('does not accept the same code twice', async () => {
    const res = await requestCode(EMAIL).expect(200);
    const code = lastCode();

    await verifyCode(res.body.item.pendingToken, code);
    await verifyCode(res.body.item.pendingToken, code).expect(401);
  });

  it('rejects a pending token issued for another step, and vice versa', async () => {
    const { token: totpToken } = sails.helpers.utils.createJwtToken(
      AccessTokenSteps.VERIFY_TOTP,
      undefined,
      600,
    );
    await verifyCode(totpToken, '123456').expect(401);

    const res = await requestCode(EMAIL).expect(200);
    const { pendingToken } = res.body.item;

    await agent()
      .post('/api/access-tokens/verify-totp')
      .send({ pendingToken, code: lastCode() })
      .expect(401);

    await agent()
      .post('/api/access-tokens/accept-terms')
      .send({ pendingToken, signature: 'a'.repeat(64) })
      .expect(401);
  });

  it('rejects an expired pending token', async () => {
    const { token } = sails.helpers.utils.createJwtToken(
      AccessTokenSteps.VERIFY_LOGIN_CODE,
      new Date(Date.now() - 2000000),
      60,
    );

    await verifyCode(token, '123456').expect(401);
  });

  it('still requires TOTP for a user who has it enabled', async () => {
    await User.updateOne({ id: user.id }).set({
      isTotpEnabled: true,
      totpSecret: sails.helpers.utils.generateTotpSecret(),
    });

    try {
      const res = await requestCode(EMAIL).expect(200);
      const verified = await verifyCode(res.body.item.pendingToken, lastCode());

      expect(verified.status).to.equal(403);
      expect([AccessTokenSteps.VERIFY_TOTP, AccessTokenSteps.ACCEPT_TERMS]).to.include(
        verified.body.step,
      );
    } finally {
      await User.updateOne({ id: user.id }).set({ isTotpEnabled: false, totpSecret: null });
    }
  });
});
