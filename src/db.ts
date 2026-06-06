import Dexie from 'dexie'
import type { PfSetting } from './types'

class PfSettingsDB extends Dexie {
  settings!: Dexie.Table<PfSetting, string>

  constructor() {
    super('PfSettingsDB')
    this.version(1).stores({
      settings: 'key',
    })
  }
}

export const pfDb = new PfSettingsDB()
