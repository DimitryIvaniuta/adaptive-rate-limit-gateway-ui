import { expect, test } from '@playwright/test';

test('shows policy and sends route probe', async ({ page }) => {
  await page.route('**/admin/policy', async (route) => {
    await route.fulfill({
      json: {
        enabled: true,
        failOpen: true,
        window: 'PT1M',
        baseLimitPerMinute: 120,
        tenantBaseLimitPerMinute: 600,
        minimumLimitPerMinute: 10,
        allowlistBypass: true,
        errorRateThreshold: 0.2,
        abuseScoreHardBlock: 100,
        statisticsBuckets: 5,
        accessListCacheTtl: 'PT1M',
        statisticsTtl: 'PT10M',
        abuseScoreTtl: 'PT2H',
        responseErrorStatuses: [400, 401, 403, 404, 409, 422, 429],
        routePolicies: { 'auth-api': { baseLimitPerMinute: 30, errorRateThreshold: 0.1 } }
      }
    });
  });

  await page.route('**/api/demo', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'x-ratelimit-remaining': '119' },
      json: { ok: true }
    });
  });

  await page.goto('/');
  await page.getByLabel('Admin token').fill('local-admin-token-change-me');
  await page.getByRole('button', { name: 'Policy viewer' }).click();
  await expect(page.getByText('Global base limit')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'auth-api' })).toBeVisible();

  await page.getByRole('button', { name: 'Traffic probe' }).click();
  await page.getByRole('button', { name: 'Send probe' }).click();
  await expect(page.getByText('200 OK')).toBeVisible();
  await expect(page.getByText('x-ratelimit-remaining')).toBeVisible();
});
