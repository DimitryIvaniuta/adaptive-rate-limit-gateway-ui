import { expect, test } from '@playwright/test';

test('loads abuse dashboard with mocked gateway data', async ({ page }) => {
  await page.route('**/admin/dashboard/top-ips**', async (route) => {
    await route.fulfill({ json: [{ subject: '203.0.113.10', rejected: 42, errors: 5, maxAbuseScore: 88, maxErrorRate: 0.32 }] });
  });
  await page.route('**/admin/dashboard/top-tenants**', async (route) => {
    await route.fulfill({ json: [{ subject: 'tenant-risk', rejected: 21, errors: 3, maxAbuseScore: 55, maxErrorRate: 0.18 }] });
  });
  await page.route('**/admin/dashboard/top-routes**', async (route) => {
    await route.fulfill({ json: [{ subject: 'auth-api', rejected: 12, errors: 4, maxAbuseScore: 60, maxErrorRate: 0.4 }] });
  });
  await page.route('**/admin/dashboard/redis-scores**', async (route) => {
    await route.fulfill({ json: [{ subject: '203.0.113.10', score: 88 }] });
  });

  await page.goto('/');
  await page.getByLabel('Admin token').fill('local-admin-token-change-me');

  await expect(page.getByRole('heading', { name: 'Abuse dashboard' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '203.0.113.10' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'tenant-risk' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'auth-api' })).toBeVisible();
});
