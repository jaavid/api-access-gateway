const assert = require('assert');
const { Miniflare } = require('miniflare');
const { MockAgent } = require('undici');

describe('API routing', () => {
  it('routes request when mapping exists', async () => {
    const mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/send', method: 'GET' }).reply(200, 'ok');

    const mf = new Miniflare({
      scriptPath: 'src/worker.js',
      modules: false,
      kvNamespaces: ['APIRoutes'],
      fetchMock: mockAgent
    });
    const ns = await mf.getKVNamespace('APIRoutes');
    await ns.put('/telegram', 'api.example.com');

    const res = await mf.dispatchFetch('https://worker.com/telegram/send');
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.strictEqual(text, 'ok');
  });

  it('returns 404 when mapping missing', async () => {
    const mf = new Miniflare({
      scriptPath: 'src/worker.js',
      modules: false,
      kvNamespaces: ['APIRoutes']
    });

    const res = await mf.dispatchFetch('https://worker.com/telegram/send');
    assert.strictEqual(res.status, 404);
  });
});
