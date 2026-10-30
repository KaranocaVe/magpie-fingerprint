import { startServer } from './server';
import type { Options } from './config';
let instance: ReturnType<typeof startServer> | undefined;
export default {
  id: 'magpie-fingerprint',
  server: async (_input: unknown, opts: Options = {}) => {
    instance ??= startServer(opts).catch((error) => {
      instance = undefined;
      throw error;
    });
    await instance;
    return {};
  },
};
