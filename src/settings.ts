import { pfDb } from './db'

export const Settings = {
  get: <T>(key: string): Promise<T | undefined> =>
    pfDb.settings.get(key).then((r) => r?.value as T | undefined),

  set: (key: string, value: unknown): Promise<string> =>
    pfDb.settings.put({ key, value }),

  remove: (key: string): Promise<void> =>
    pfDb.settings.delete(key),
}
