import { serve } from '@hono/node-server';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
// eslint-disable-next-line import/no-unresolved
import { bearerAuth } from 'hono/bearer-auth';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { config } from './lib/config';
import { l } from './lib/log';
import { appDownloadQueue } from './lib/queues/app-download';

const app = new Hono();
app.use('/*', bearerAuth({ token: config.token }));

const startAnalysisRoute = app.put(
    '/analysis',
    zValidator(
        'json',
        z.object({
            platform: z.enum([config.target.platform]),
            appId: z.string(),
        }),
    ),
    async (c) => {
        const { appId } = c.req.valid('json');
        const token = nanoid(32);

        appDownloadQueue.push({ id: token, appId });

        return c.json({ status: 'success', message: 'Analysis started.', token });
    },
);

const port = 3000;
l.info(`Server is running on port ${port}.`);

serve({
    fetch: app.fetch,
    port,
});

export type StartAnalysis = typeof startAnalysisRoute;
