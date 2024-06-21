import { readFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { rootDir } from './util';

const configSchema = z.object({
    target: z
        .object({
            platform: z.enum(['android']),

            emulatorName: z.string(),
            snapshotName: z.string(),
            headless: z.boolean().optional(),
        })
        .or(
            z.object({
                platform: z.enum(['ios']),

                username: z.enum(['root', 'mobile']).optional(),
                password: z.string().optional(),
                ip: z.string().optional(),
                port: z.number().optional(),
                proxyIp: z.string(),
            }),
        ),

    analysisResultUrl: z.string().url(),
    token: z.string(),

    analysisDurationMs: z.number(),
    logLevel: z.enum(['debug', 'verbose', 'info', 'warn', 'error']).optional(),
});

export const config = configSchema.parse(JSON.parse(await readFile(join(rootDir, 'config.json'), 'utf-8')));
