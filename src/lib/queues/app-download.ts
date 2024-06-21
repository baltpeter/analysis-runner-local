import Queue from 'better-queue';
import { join } from 'path';
import { downloadApp } from '../app-download';
import { config } from '../config';
import { l } from '../log';
import { rootDir } from '../util';
import { analysisQueue } from './analysis';

export type AppDownloadQueueInput = {
    id: string;
    appId: string;
};

export const appDownloadQueue = new Queue<AppDownloadQueueInput, undefined>(
    async (options: AppDownloadQueueInput, cb) => {
        try {
            l.info('Downloading app…', { appId: options.appId });
            const { appFiles } = await downloadApp(config.target.platform, options.appId);

            analysisQueue.push({ id: options.id, appFiles });

            l.verbose('Downloaded app.', { appId: options.appId, appFiles });
            cb(null);
        } catch (error) {
            l.debug('Reporting download error to server…');
            await fetch(config.analysisResultUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisToken: options.id,
                    status: 'error',
                }),
            });

            l.error('Failed to download app.', { appId: options.appId, error });
            cb(error);
        }
    },
    {
        concurrent: 1,
        maxTimeout: 1000 * 60 * 10,
        afterProcessDelay: 600,
        store: {
            type: 'sql',
            dialect: 'sqlite',
            path: join(rootDir, 'queue-download.db'),
        },
    },
);
