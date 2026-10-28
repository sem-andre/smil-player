import * as chai from 'chai';
import { PlaylistTriggers } from '../../../src/components/playlist/playlistTriggers/playlistTriggers';
import { RegionAttributes } from '../../../src/models/xmlJsonModels';
import { SMILMedia } from '../../../src/models/mediaModels';
import { TriggerObject } from '../../../src/models/triggerModels';
import { createDefaultOptions, createMockFiles, createMockSos, stub } from '../playlistProcessor/testUtils';

const expect = chai.expect;

function makeFlatRegion(regionName: string): RegionAttributes {
	return { regionName, left: 0, top: 0, width: 100, height: 100 } as RegionAttributes;
}

function makeNestedRegion(regionName: string, subRegions: RegionAttributes[]): RegionAttributes {
	return { regionName, left: 0, top: 0, width: 100, height: 100, region: subRegions } as RegionAttributes;
}

describe('PlaylistTriggers', () => {
	describe('handleTriggers', () => {
		it('repopulates triggersEndless[id].regionInfo for a trigger targeting a flat region', async () => {
			const triggers = new PlaylistTriggers(
				createMockSos(),
				createMockFiles(),
				createDefaultOptions(),
				stub().resolves(undefined),
			);
			const flatRegion = makeFlatRegion('video');
			const media = {
				triggerValue: 'triggerA',
				regionInfo: flatRegion,
				src: 'test.jpg',
			} as unknown as SMILMedia;

			await triggers.handleTriggers(media);

			expect(triggers.triggersEndless.triggerA?.regionInfo).to.equal(flatRegion);
		});

		it('keeps existing nested-region free-slot allocation behavior unchanged', async () => {
			const triggers = new PlaylistTriggers(
				createMockSos(),
				createMockFiles(),
				createDefaultOptions(),
				stub().resolves(undefined),
			);
			const subRegion1 = makeFlatRegion('video1');
			const subRegion2 = makeFlatRegion('video2');
			const nestedRegion = makeNestedRegion('video', [subRegion1, subRegion2]);
			const media = {
				triggerValue: 'triggerB',
				regionInfo: nestedRegion,
				src: 'test.jpg',
			} as unknown as SMILMedia;

			const result = await triggers.handleTriggers(media);

			expect([subRegion1, subRegion2]).to.include(result);
			expect(triggers.triggersEndless.triggerB?.regionInfo).to.equal(result);
		});
	});

	describe('processTriggerRepeatCount (flat region regression)', () => {
		it('resets play to false after each firing, allowing the trigger to be re-fired', async () => {
			const flatRegion = makeFlatRegion('zone1');
			const options = createDefaultOptions();
			options.promiseAwaiting.zone1 = { promiseFunction: [] };

			let triggers: PlaylistTriggers;
			const processPlaylist = async () => {
				// mirrors real playback: handleTriggers() is invoked for the trigger's
				// media as the playlist processor plays it, repopulating regionInfo
				await triggers.handleTriggers({
					triggerValue: 'triggerA',
					regionInfo: flatRegion,
					src: 'test.jpg',
				} as unknown as SMILMedia);
			};
			triggers = new PlaylistTriggers(
				createMockSos(),
				createMockFiles(),
				options,
				processPlaylist,
			);

			// mirrors the real entry point (watchKeyboardInput etc.), which lazily
			// creates triggersEndless[id] via lodash `set` before the first fire
			(triggers.triggersEndless as any).triggerA = {
				play: false,
				syncCanceled: false,
				latestEventFired: Date.now(),
				triggerRandom: 0,
			};
			const triggerMedia = { seq: { begin: '', end: '', repeatCount: '1', dur: '' } } as TriggerObject;

			await (triggers as any).processTriggerRepeatCount({ trigger: 'triggerA' }, triggerMedia);
			expect(triggers.triggersEndless.triggerA.play).to.equal(false);

			// re-fire: without the fix, triggersEndless.triggerA.regionInfo would
			// stay deleted after the first call's `delete currentTrigger.regionInfo`,
			// and processTriggerRepeatCount would bail out before resetting `play`
			await (triggers as any).processTriggerRepeatCount({ trigger: 'triggerA' }, triggerMedia);
			expect(triggers.triggersEndless.triggerA.play).to.equal(false);
		});
	});
});
