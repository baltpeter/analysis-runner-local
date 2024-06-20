import { execa } from 'execa';
import { remove } from 'fs-extra';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

export type DownloadAppResult = {
    appFiles: string[] | string;
    cleanUpAppFiles: () => Promise<void>;
};

export const downloadApp = async (platform: 'android' | 'ios', appId: string): Promise<DownloadAppResult> => {
    const outDir = temporaryDirectory();
    const cleanUpAppFiles = () => remove(outDir);

    if (platform === 'android') {
        await execa('apkeep', [
            '-d',
            'google-play',
            '-o',
            'device=px_3a,locale=en_DE,include_additional_files=1,split_apk=1',
            '-a',
            appId,
            outDir,
        ]).catch(() => execa('apkeep', ['-a', appId, outDir]));

        const files = await readdir(outDir, { withFileTypes: true });

        const file = files[0];
        if (!file || files.length !== 1) throw new Error('Failed to download app: Unexpected output.');

        if (file.isDirectory()) {
            const appFiles = await readdir(join(outDir, file.name)).then((f) =>
                f.map((f) => join(outDir, file.name, f)),
            );

            return { appFiles, cleanUpAppFiles };
        } else if (file.isFile()) return { appFiles: join(outDir, file.name), cleanUpAppFiles };

        throw new Error('Failed to download app: Unexpected output.');
    } else if (platform === 'ios') {
        const { stdout } = await execa('ipatool', [
            'download',
            '-b',
            appId,
            '--purchase',
            '--non-interactive',
            '--format',
            'json',
            '-o',
            outDir,
        ]);
        const res = JSON.parse(stdout);

        if (!res.success || !res.output) throw new Error('Failed to download app.');

        return { appFiles: res.output, cleanUpAppFiles };
    }

    throw new Error('Unsupported platform.');
};
