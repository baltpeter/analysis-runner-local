import { packageUp } from 'package-up';
import { dirname } from 'path';

const pJsonPath = await packageUp();
if (!pJsonPath) throw new Error('Failed to find package.json');
export const rootDir = dirname(pJsonPath);
