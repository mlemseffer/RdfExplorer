import { test, expect } from '@playwright/test';

test.describe('RdfExplorer smoke', () => {
  test('boots and renders the main UI', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('RdfExplorer');
    await expect(page.getByRole('heading', { name: /RdfExplorer/i })).toBeVisible();

    // Header import buttons are wired up.
    await expect(page.getByRole('button', { name: /Importer RDF/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Exporter SVG/i })).toBeVisible();

    // The D3 root SVG mounts inside the graph container.
    await expect(page.locator('#graphContainer svg')).toBeVisible();

    // Stats panel renders default counters.
    await expect(page.locator('#graphOverlay')).toContainText(/Graphe:/);
  });

  test('toggles dark mode and persists preference', async ({ page }) => {
    await page.goto('/');
    // Ensure a clean baseline regardless of any prior run.
    await page.evaluate(() => {
      window.localStorage.removeItem('rdfexplorer-theme');
      document.documentElement.classList.remove('dark-mode');
    });

    const root = page.locator('html');
    await expect(root).not.toHaveClass(/dark-mode/);

    await page.locator('#toggleThemeBtn').click();
    await expect(root).toHaveClass(/dark-mode/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark-mode/);

    // Cleanup so subsequent runs start in light mode.
    await page.evaluate(() => window.localStorage.removeItem('rdfexplorer-theme'));
  });

  test('loads a Turtle file and populates the types panel', async ({ page }) => {
    await page.goto('/');
    const ttl = `
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:alice a foaf:Person ; foaf:name "Alice" ; foaf:knows ex:bob .
ex:bob a foaf:Person ; foaf:name "Bob" .
    `.trim();

    await page.locator('#fileInput').setInputFiles({
      name: 'sample.ttl',
      mimeType: 'text/turtle',
      buffer: Buffer.from(ttl, 'utf-8'),
    });

    // Triples stat should reflect parsed content (5 triples in the fixture above).
    await expect(page.locator('#statsPanelContent')).toContainText('Triplets totaux');
    await expect
      .poll(async () => await page.locator('#statsPanelContent').innerText())
      .toMatch(/Triplets totaux:\s*5/);

    // RDF types panel should list at least one inferred type checkbox.
    await expect(page.locator('#rdfTypesCheckboxes input[type="checkbox"]').first()).toBeVisible();
  });
});
