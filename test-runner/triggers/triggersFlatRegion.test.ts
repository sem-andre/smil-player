import { test, expect } from '../fixtures';
import { DUID, Timeouts } from '../config';
import { testCoordinates } from '../helpers';
import { durationCandidates } from '../duration/durationCandidates';

test.describe('triggersFlatRegion.smil test', () => {
	test('keyboard trigger on a flat region can be re-fired after it completes', async ({ page, context, smilUrls, monitor }) => {
		await context.addInitScript((url: string) => {
			(window as any).__SMIL_URL__ = url;
		}, smilUrls.triggersFlatRegion);
		await page.goto(`/?duid=${DUID}`);
		const frame = page.frameLocator('iframe');
		monitor.watch(durationCandidates('triggersFlatRegion'));

		// Initial video visible, full (flat) region
		await expect(page.locator('video[src*="videos/video-test_465b7757.mp4"]')).toBeVisible({ timeout: Timeouts.firstElement });
		await testCoordinates(page.locator('video[src*="videos/video-test_465b7757.mp4"]'), 10, 10, 1280, 720);

		// First fire: type 7-8-9 to activate trigger1 (repeatCount="1")
		await page.waitForTimeout(Timeouts.transition);
		await page.keyboard.press('7');
		await page.keyboard.press('8');
		await page.keyboard.press('9');

		await expect(frame.locator('img[id*="img_4_d0d4"][id*=".jpg-video-img"]')).toBeVisible({ timeout: Timeouts.longerElementAwait });
		await testCoordinates(frame.locator('img[id*="img_4_d0d4"][id*=".jpg-video-img"]'), 10, 10, 1280, 720);

		// After single play, default content resumes
		await expect(frame.locator('img[id*="img_4_d0d4"][id*=".jpg-video-img"]')).not.toBeVisible({ timeout: Timeouts.elementAwait });
		await expect(page.locator('video[src*="videos/video-test_465b7757.mp4"]')).toBeVisible({ timeout: Timeouts.elementAwait });

		// Second fire: without the fix this never fires again, because the
		// flat-region trigger's internal "playing" state never got cleared
		await page.waitForTimeout(Timeouts.transition);
		await page.keyboard.press('7');
		await page.keyboard.press('8');
		await page.keyboard.press('9');

		await expect(frame.locator('img[id*="img_4_d0d4"][id*=".jpg-video-img"]')).toBeVisible({ timeout: Timeouts.longerElementAwait });
		await testCoordinates(frame.locator('img[id*="img_4_d0d4"][id*=".jpg-video-img"]'), 10, 10, 1280, 720);

		// Returns to default content again
		await expect(frame.locator('img[id*="img_4_d0d4"][id*=".jpg-video-img"]')).not.toBeVisible({ timeout: Timeouts.elementAwait });
		await expect(page.locator('video[src*="videos/video-test_465b7757.mp4"]')).toBeVisible({ timeout: Timeouts.elementAwait });
		await testCoordinates(page.locator('video[src*="videos/video-test_465b7757.mp4"]'), 10, 10, 1280, 720);
		await monitor.assertDurationsWithinTolerance();
	});
});
