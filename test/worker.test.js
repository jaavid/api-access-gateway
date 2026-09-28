const assert = require('assert');
const { Miniflare } = require('miniflare');
const { MockAgent } = require('undici');

function makeMiniflare({ mockAgent, apiKey = '' } = {}) {
  return new Miniflare({
    scriptPath: 'src/worker.js',
    modules: false,
    kvNamespaces: ['APIRoutes'],
    bindings: apiKey ? { GATEWAY_API_KEY: apiKey } : {},
    fetchMock: mockAgent,
  });
}

describe('API routing', () => {
  it('routes a legacy host-string mapping', async () => {
    const mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/send?x=1', method: 'GET' }).reply(200, 'ok');

    const mf = makeMiniflare({ mockAgent });
    const ns = await mf.getKVNamespace('APIRoutes');
    await ns.put('/telegram', 'api.example.com');

    const res = await mf.dispatchFetch('https://worker.com/telegram/send?x=1');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'ok');
  });

  it('routes a JSON mapping', async () => {
    const mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/v1/test', method: 'POST' }).reply(200, { ok: true });

    const mf = makeMiniflare({ mockAgent });
    const ns = await mf.getKVNamespace('APIRoutes');
    await ns.put('/meta', JSON.stringify({ upstream: 'https://api.example.com', probe_path: '/health' }));

    const res = await mf.dispatchFetch('https://worker.com/meta/v1/test', {
      method: 'POST',
      body: 'hello',
    });
    assert.strictEqual(res.status, 200);
  });

  it('returns 404 when mapping is missing', async () => {
    const mf = makeMiniflare();
    const res = await mf.dispatchFetch('https://worker.com/telegram/send');
    assert.strictEqual(res.status, 404);
  });

  it('requires X-API-Gateway-Key when a secret is configured', async () => {
    const mf = makeMiniflare({ apiKey: 'secret-key' });

    const denied = await mf.dispatchFetch('https://worker.com/_gateway/health');
    assert.strictEqual(denied.status, 401);

    const allowed = await mf.dispatchFetch('https://worker.com/_gateway/health', {
      headers: { 'X-API-Gateway-Key': 'secret-key' },
    });
    assert.strictEqual(allowed.status, 200);
    const body = await allowed.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.auth_required, true);
    assert.strictEqual(body.version, '2.0');
  });

  it('probes an allowlisted route and reports latency/status', async () => {
    const mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    const pool = mockAgent.get('https://api.example.com');
    pool.intercept({ path: '/health', method: 'GET' }).reply(404, 'reachable');

    const mf = makeMiniflare({ mockAgent, apiKey: 'secret-key' });
    const ns = await mf.getKVNamespace('APIRoutes');
    await ns.put('/telegram', JSON.stringify({
      upstream: 'https://api.example.com',
      probe_path: '/health',
    }));

    const res = await mf.dispatchFetch('https://worker.com/_gateway/probe/telegram', {
      headers: { 'X-API-Gateway-Key': 'secret-key' },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.reachable, true);
    assert.strictEqual(body.upstream_status, 404);
    assert.strictEqual(body.route, 'telegram');
    assert.ok(Number.isInteger(body.latency_ms));
  });

  it('lists only configured KV routes', async () => {
    const mf = makeMiniflare({ apiKey: 'secret-key' });
    const ns = await mf.getKVNamespace('APIRoutes');
    await ns.put('/telegram', 'api.telegram.org');
    await ns.put('/bale', 'tapi.bale.ai');

    const res = await mf.dispatchFetch('https://worker.com/_gateway/routes', {
      headers: { 'X-API-Gateway-Key': 'secret-key' },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(body.routes.map((route) => route.name), ['bale', 'telegram']);
  });
});
