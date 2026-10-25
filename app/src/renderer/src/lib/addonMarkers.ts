/**
 * The markers addons put on the Collection Map (`nyerk.map.markers`, main/addons.ts): what main
 * has now, then each change, for as long as the component using it is mounted.
 */
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { bridge } from '@/lib/bridge.ts'
import type { AddonMarkers } from '@shared/addons.ts'

export function useAddonMarkers() {
  const markers = shallowRef<AddonMarkers[]>([])
  let off: (() => void) | null = null
  let changed = false
  onMounted(() => {
    off = bridge().on('addons:markers', (list) => {
      changed = true
      markers.value = list
    })
    // A change that came while asking is newer than the answer.
    void bridge()
      .invoke('addons:markers')
      .then((list) => {
        if (!changed) markers.value = list
      })
  })
  onBeforeUnmount(() => off?.())
  return markers
}
