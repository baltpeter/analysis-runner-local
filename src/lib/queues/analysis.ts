import Queue from 'better-queue';
import { pause, startAnalysis, type AnalysisOptions } from 'cyanoacrylate';
import { remove } from 'fs-extra';
import { join } from 'path';
import { process } from 'trackhar';
import { config } from '../config';
import { l } from '../log';
import { rootDir } from '../util';

export type AnalysisQueueInput = {
    id: string;
    appFiles: string | `${string}.apk`[];
};

const analysis = await startAnalysis(
    (config.target.platform === 'android'
        ? ({
              platform: 'android',
              runTarget: 'emulator',
              capabilities: ['frida', 'certificate-pinning-bypass'],
              targetOptions: {
                  startEmulatorOptions: {
                      emulatorName: config.target.emulatorName,
                      headless: config.target.headless !== false,
                      audio: false,
                      ephemeral: true,
                      stopWithAnalysis: false,
                  },
                  snapshotName: config.target.snapshotName,
              },
          } satisfies AnalysisOptions<'android', 'emulator', ('frida' | 'certificate-pinning-bypass')[]>)
        : ({
              platform: 'ios',
              runTarget: 'device',
              capabilities: ['certificate-pinning-bypass'],
              targetOptions: {
                  username: config.target.username as 'mobile',
                  password: config.target.password as string,
                  ip: config.target.ip as string,
                  port: config.target.port as number,
                  proxyIp: config.target.proxyIp,
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } satisfies AnalysisOptions<'ios', 'device', 'certificate-pinning-bypass'[]>)) as any,
);

export const analysisQueue = new Queue<AnalysisQueueInput, undefined>(
    async (options: AnalysisQueueInput, cb) => {
        try {
            l.info('Analyzing app…', { appFiles: options.appFiles });

            const isEmu = analysis.platform.target.runTarget === 'emulator';

            l.debug('Ensuring tracking domain resolution…');
            await analysis.ensureTrackingDomainResolution();

            if (!isEmu) {
                l.debug('Waiting for device…');
                await analysis.platform.waitForDevice();
            }
            l.debug('Ensuring device…');
            await analysis.ensureDevice();
            if (isEmu) {
                l.debug('Resetting emulator…');
                await analysis.resetDevice();
            }

            l.debug('Starting app analysis…');
            const appAnalysis = await analysis.startAppAnalysis(options.appFiles);

            l.debug('Installing app…');
            await appAnalysis.installApp();
            l.debug('Setting app permissions…');
            await appAnalysis.setAppPermissions();

            l.debug('Starting traffic collection…');
            await appAnalysis.startTrafficCollection('no-interaction');
            l.debug('Starting app…');
            await appAnalysis.startApp();
            l.debug(`Waiting for ${config.analysisDurationMs / 1000} seconds…`);
            await pause(config.analysisDurationMs);
            l.debug('Stopping traffic collection…');
            await appAnalysis.stopTrafficCollection();

            if (!isEmu) {
                l.debug('Uninstalling app…');
                await appAnalysis.uninstallApp();
            }

            l.debug('Stopping app analysis…');
            const {
                traffic: { 'no-interaction': har },
            } = await appAnalysis.stop();
            if (!har) throw new Error('This should never happen.');

            l.debug('Cleaning up app files…');
            for (const file of Array.isArray(options.appFiles) ? options.appFiles : [options.appFiles])
                await remove(file);

            l.debug('Analysing traffic using TrackHAR…');
            const trackHarResult = await process(har);

            l.debug('Sending analysis result to server…');
            await fetch(config.analysisResultUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisToken: options.id,
                    status: 'success',

                    har,
                    trackHarResult,
                }),
            });

            l.verbose('Analysed app.', { appFiles: options.appFiles });
            cb();
        } catch (error) {
            l.debug('Reporting analysis error to server…');
            await fetch(config.analysisResultUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisToken: options.id,
                    status: 'error',
                }),
            });

            l.error('Failed to analyze app.', { appFiles: options.appFiles, error });
            cb(error);
        }
    },
    {
        concurrent: 1,
        maxTimeout: 1000 * 60 * 10,
        store: {
            type: 'sql',
            dialect: 'sqlite',
            path: join(rootDir, 'queue-analysis.db'),
        },
    },
);
