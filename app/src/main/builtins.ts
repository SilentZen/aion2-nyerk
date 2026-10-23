/**
 * The app's features that come as addons (app/addons/, shared/addons.ts BUILTIN_ADDONS): whether
 * each is switched on. Read from the settings alone, so the code each one gates can ask without
 * importing main/addons.ts.
 */
import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { builtinOn, type BuiltinAddon } from '../shared/addons.ts'
import { settings } from './settings.ts'

export const featureOn = (id: BuiltinAddon): boolean => builtinOn(settings.get('addons').enabled, id)

/**
 * The PvP Log starts off since the Task List came (shared/addons.ts DEFAULT_ON_ADDONS). A profile
 * that never switched it but has a pvp.json (written by the log, even when cleared) was using it: it is recorded as on, so the update
 * takes nothing away. Before the addons are first looked at; returns whether it did.
 */
export function keepPvpLogOn(): boolean {
  const stored = settings.get('addons')
  if ('pvp-log' in stored.enabled || !existsSync(join(app.getPath('userData'), 'pvp.json'))) return false
  settings.set('addons', { ...stored, enabled: { ...stored.enabled, 'pvp-log': true } })
  return true
}
