import { expect, test } from '@playwright/test';

test('creates and disables access-list entries', async ({ page }) => {
  let entries = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      subjectType: 'IP',
      subjectValue: '203.0.113.10',
      mode: 'BLOCK',
      reason: 'Initial incident',
      expiresAt: null,
      active: true,
      createdAt: '2026-05-30T18:00:00Z',
      updatedAt: '2026-05-30T18:00:00Z'
    }
  ];

  await page.route('**/admin/access-list', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: entries });
      return;
    }

    const payload = await route.request().postDataJSON();
    entries = [{ ...payload, id: '22222222-2222-2222-2222-222222222222', active: true, createdAt: '2026-05-30T19:00:00Z', updatedAt: '2026-05-30T19:00:00Z' }, ...entries];
    await route.fulfill({ status: 201, json: entries[0] });
  });

  await page.route('**/admin/access-list/*', async (route) => {
    entries = [];
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/');
  await page.getByLabel('Admin token').fill('local-admin-token-change-me');
  await page.getByRole('button', { name: 'Access lists' }).click();

  await expect(page.getByText('203.0.113.10')).toBeVisible();
  await page.getByLabel('Subject value').fill('tenant-vip');
  await page.getByLabel('Subject type').selectOption('TENANT');
  await page.getByLabel('Mode').selectOption('ALLOW');
  await page.getByLabel('Reason').fill('VIP payment partner');
  await page.getByRole('button', { name: 'Create access-list entry' }).click();

  await expect(page.getByText('Access-list entry created.')).toBeVisible();
  await expect(page.getByText('tenant-vip')).toBeVisible();

  await page.getByRole('button', { name: 'Disable' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Disable entry' }).click();
  await expect(page.getByText('No active entries')).toBeVisible();
});
