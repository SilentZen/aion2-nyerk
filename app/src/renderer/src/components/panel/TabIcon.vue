<script setup lang="ts">
// A panel tab's icon (the open tab has its name beside it): the app's own drawn here, an addon's
// from the .svg its manifest names (drawn in the tab's colour, as a mask), or else its first letter.
import { computed } from 'vue'
import { ADDON_SCHEME } from '@shared/addons.ts'

const props = defineProps<{ id: string; label: string; addon?: string; icon?: string | null }>()

// 24×24, stroked like the header's cog.
const PATHS: Record<string, string[]> = {
  // A paw print.
  collection: [
    'M12 13.5c-2.6 0-5 2.6-5 4.8 0 1.4 1.1 2.2 2.4 2.2.9 0 1.7-.4 2.6-.4s1.7.4 2.6.4c1.3 0 2.4-.8 2.4-2.2 0-2.2-2.4-4.8-5-4.8z',
    'M6.5 8.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 1 0 0-3.6zM9.5 3.7a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 1 0 0-3.6zM14.5 3.7a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 1 0 0-3.6zM17.5 8.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 1 0 0-3.6z',
  ],
  // A stopwatch.
  session: ['M12 21a8 8 0 1 0 0-16 8 8 0 1 0 0 16z', 'M12 9v4l2.5 2.5M10 2h4M12 2v3'],
  // An hourglass.
  timers: ['M6 2h12M6 22h12', 'M7 2v3a5 5 0 0 0 2.5 4.3L12 11l2.5-1.7A5 5 0 0 0 17 5V2M7 22v-3a5 5 0 0 1 2.5-4.3L12 13l2.5 1.7A5 5 0 0 1 17 19v3'],
  // Crossed swords.
  pvp: ['M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2', 'M14.5 6.5L18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2'],
}
const paths = computed(() => PATHS[props.id] ?? null)
const mask = computed(() => {
  if (!props.addon || !props.icon) return null
  const url = `url("${ADDON_SCHEME}://${props.addon}/${props.icon}")`
  return { maskImage: url, WebkitMaskImage: url }
})
</script>

<template>
  <svg
    v-if="paths"
    viewBox="0 0 24 24"
    class="size-4 shrink-0"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="d in paths" :key="d" :d="d" />
  </svg>
  <span
    v-else-if="mask"
    class="size-4 shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
    :style="mask"
    aria-hidden="true"
  />
  <span
    v-else
    class="flex size-4 shrink-0 items-center justify-center rounded border border-current text-[10px] font-semibold leading-none"
    aria-hidden="true"
    >{{ label.charAt(0).toUpperCase() }}</span
  >
</template>
