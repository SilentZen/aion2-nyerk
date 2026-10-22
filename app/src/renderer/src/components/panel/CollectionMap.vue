<script setup lang="ts">
// The collection's map: the pets the Collection tab's filters show, on one zone's map, the ones
// in that zone nearest you first. Click a pet to pick its spawns out; the arrow opens its drop
// locations (and back comes here).
import { computed, ref, watch } from 'vue'
import GenusPill from '@/components/GenusPill.vue'
import LevelBadge from '@/components/LevelBadge.vue'
import PetIcon from '@/components/PetIcon.vue'
import Select from '@/components/Select.vue'
import WorldMap, { type MapLayer } from '@/components/WorldMap.vue'
import { useCollectionList } from '@/lib/collectionList.ts'
import { displayName } from '@/lib/petDb.ts'
import { formatDistance } from '@/lib/spawns.ts'
import { useApp } from '@/stores/app.ts'
import { nextLevelSouls, type Pet } from '@shared/tracker.ts'

const store = useApp()
const { spawns, list, here, near } = useCollectionList()

/** One colour per pet, as on a pet's own map: the selected one in the accent. */
const PALETTE = ['#f76b15', '#30a46c', '#0090ff', '#ffc53d', '#e54666', '#12a594', '#ab4aba', '#8e8c99']
const SELECTED = '#a3acff'

/** Each listed pet's soul monster spawns, by zone, with the monsters that spawn there. */
const placed = computed(() => {
  const out = new Map<number, Map<number, { points: [number, number][]; monsters: { name: string; level: number }[] }>>()
  for (const p of list.value) {
    const byWorld = new Map<number, { points: [number, number][]; monsters: { name: string; level: number }[] }>()
    for (const d of spawns.value?.pets[p.id] ?? []) {
      for (const w of d.worlds) {
        const entry = byWorld.get(w.world) ?? { points: [], monsters: [] }
        entry.points.push(...w.points)
        entry.monsters.push({ name: d.name, level: d.level })
        byWorld.set(w.world, entry)
      }
    }
    out.set(p.id, byWorld)
  }
  return out
})

/** The zones the listed pets spawn in: yours first, then by how many of them spawn there. */
const zones = computed(() => {
  const counts = new Map<number, number>()
  for (const byWorld of placed.value.values()) for (const w of byWorld.keys()) counts.set(w, (counts.get(w) ?? 0) + 1)
  return [...counts.entries()]
    .map(([id, pets]) => ({ id, pets, name: spawns.value?.worlds[id]?.name ?? `#${id}`, yours: id === here.value?.world }))
    .filter((z) => spawns.value?.worlds[z.id])
    .sort((a, b) => Number(b.yours) - Number(a.yours) || b.pets - a.pets || a.name.localeCompare(b.name))
})
const zoneOptions = computed(() =>
  zones.value.map((z) => ({ value: z.id, label: `${z.name} (${z.pets})${z.yours ? ' · you are here' : ''}` })),
)
const worldId = ref<number | null>(null)
watch(
  zones,
  (list) => {
    if (!list.some((z) => z.id === worldId.value)) worldId.value = list[0]?.id ?? null
  },
  { immediate: true },
)
const world = computed(() => (spawns.value && worldId.value !== null ? spawns.value.worlds[worldId.value] ?? null : null))
const worldName = (id: number): string => spawns.value?.worlds[id]?.name ?? `#${id}`

/** You, on this map, when you are in this zone and the tracker knows where. */
const you = computed<[number, number] | null>(() => (here.value && here.value.world === worldId.value ? here.value.at : null))

interface Row {
  pet: Pet
  points: [number, number][]
  monsters: { name: string; level: number }[]
  distance: number | null
}
/** The listed pets in this zone, nearest first when your position is known (else as the tab sorts them). */
const inZone = computed<Row[]>(() => {
  const rows: Row[] = []
  for (const pet of list.value) {
    const spawned = worldId.value !== null ? placed.value.get(pet.id)?.get(worldId.value) : undefined
    if (!spawned) continue
    const at = you.value
    const distance = at ? Math.min(...spawned.points.map(([x, y]) => Math.hypot(x - at[0], y - at[1]))) : null
    rows.push({ pet, points: spawned.points, monsters: spawned.monsters, distance })
  }
  return rows.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
})
/** The listed pets that do not spawn in this zone, with the zones they do. */
const elsewhere = computed(() =>
  list.value
    .filter((p) => worldId.value === null || !placed.value.get(p.id)?.has(worldId.value))
    .map((pet) => ({ pet, worlds: [...(placed.value.get(pet.id)?.keys() ?? [])].filter((w) => spawns.value?.worlds[w]) })),
)

const selected = ref<number | null>(null)
watch(
  inZone,
  (rows) => {
    if (!rows.some((r) => r.pet.id === selected.value)) selected.value = rows[0]?.pet.id ?? null
  },
  { immediate: true },
)
// By the pet's place in the collection's list, so colours stay put as you move and the rows re-sort.
const colorOf = (id: number): string => {
  if (id === selected.value) return SELECTED
  const i = list.value.findIndex((p) => p.id === id)
  return PALETTE[Math.max(0, i) % PALETTE.length]!
}

const layers = computed<MapLayer[]>(() =>
  inZone.value.map((r) => ({ key: r.pet.id, points: r.points, color: colorOf(r.pet.id), active: r.pet.id === selected.value })),
)
/**
 * The selected pet's spawns, and you when you are here, so the view shows the way there. Set only
 * when the pet or zone changes: the map refits on every new focus, and you move all the time.
 */
const focus = ref<[number, number][]>([])
watch(
  [selected, worldId],
  () => {
    const row = inZone.value.find((r) => r.pet.id === selected.value)
    focus.value = row ? [...row.points, ...(you.value ? [you.value] : [])] : []
  },
  { immediate: true },
)

/** A pet from another zone: its zone's map, with it picked out. */
function showElsewhere(pet: Pet, worlds: number[]): void {
  if (!worlds.length) return
  worldId.value = worlds[0]!
  selected.value = pet.id
}
const monsterLine = (r: Row): string =>
  [...new Map(r.monsters.map((m) => [m.name, m])).values()].map((m) => `${m.name} (Lv${m.level})`).join(', ')
const progress = (pet: Pet): string => {
  const next = nextLevelSouls(pet)
  return next === null ? 'max' : `${pet.souls} / ${next}`
}
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-3">
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="flex size-7 shrink-0 items-center justify-center rounded-md text-darker transition hover:bg-light hover:text-default"
        title="Back to the collection"
        @click="store.openCollectionMap(false)"
      >
        <svg viewBox="0 0 16 16" class="size-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 3L5 8l5 5" />
        </svg>
      </button>
      <div class="min-w-0 flex-1">
        <div class="text-base font-semibold">Collection map</div>
        <div class="truncate text-xs text-darker">
          {{ list.length }} pet{{ list.length === 1 ? '' : 's' }} match the Collection's filters<template v-if="world">
            · {{ inZone.length }} in {{ world.name }}</template>
        </div>
      </div>
      <div v-if="zones.length" class="flex shrink-0 items-center gap-1.5 text-xs text-darker">
        Zone
        <Select
          :model-value="worldId ?? undefined"
          :options="zoneOptions"
          class="max-w-[220px]"
          title="Zone"
          @update:model-value="worldId = $event"
        />
      </div>
    </div>

    <p v-if="!spawns" class="text-sm text-darker">Loading drop locations…</p>
    <p v-else-if="!list.length" class="text-sm text-darker">No pets match the Collection's filters.</p>

    <div v-else class="flex min-h-0 flex-1 gap-3">
      <ul class="w-[300px] shrink-0 space-y-1 overflow-y-auto pr-1">
        <li
          v-for="r in inZone"
          :key="r.pet.id"
          :class="[
            'group cursor-pointer rounded-lg border px-2.5 py-2 transition',
            r.pet.id === selected ? 'border-accent bg-accent-soft/50' : 'border-card bg-card hover:border-light',
          ]"
          @click="selected = r.pet.id"
        >
          <div class="flex items-center gap-2">
            <span class="size-2.5 shrink-0 rounded-full" :style="{ background: colorOf(r.pet.id) }" />
            <PetIcon :id="r.pet.id" :size="26" />
            <span class="min-w-0 truncate text-sm font-medium">{{ displayName(r.pet) }}</span>
            <GenusPill :id="r.pet.id" />
            <span v-if="r.distance !== null" class="ml-auto shrink-0 text-xs font-semibold tabular-nums">
              {{ formatDistance(r.distance) }}
            </span>
            <button
              type="button"
              :class="['flex size-5 shrink-0 items-center justify-center rounded text-darkest transition hover:text-default', r.distance === null ? 'ml-auto' : '']"
              title="Show where its souls drop"
              @click.stop="store.openPet(r.pet.id)"
            >
              <svg viewBox="0 0 16 16" class="size-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          </div>
          <div class="mt-0.5 flex items-center gap-1.5 pl-[18px] text-[11px] text-darker">
            <span class="truncate" :title="monsterLine(r)">{{ monsterLine(r) }}</span>
          </div>
          <div class="flex items-center gap-2 pl-[18px] text-[11px]">
            <LevelBadge :pet="r.pet" />
            <span class="tabular-nums text-darkest">{{ progress(r.pet) }}</span>
            <span v-if="near.get(r.pet.id)" class="font-semibold text-green">{{ near.get(r.pet.id)!.count }} around you</span>
          </div>
        </li>
        <li v-if="world && !inZone.length" class="px-1 py-2 text-xs text-darker">None of these pets spawn in {{ world.name }}.</li>

        <template v-if="elsewhere.length">
          <li class="px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-darkest">Other zones</li>
          <li
            v-for="e in elsewhere"
            :key="e.pet.id"
            :class="[
              'flex items-center gap-2 rounded-lg border border-card px-2.5 py-1.5 opacity-70 transition',
              e.worlds.length ? 'cursor-pointer hover:border-light hover:opacity-100' : '',
            ]"
            :title="e.worlds.length ? `Show it on the ${worldName(e.worlds[0]!)} map` : ''"
            @click="showElsewhere(e.pet, e.worlds)"
          >
            <PetIcon :id="e.pet.id" :size="22" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-xs font-medium">{{ displayName(e.pet) }}</div>
              <div class="truncate text-[11px] text-darkest">
                {{ e.worlds.length ? e.worlds.map(worldName).join(', ') : 'not on the map' }}
              </div>
            </div>
            <button
              type="button"
              class="flex size-5 shrink-0 items-center justify-center rounded text-darkest transition hover:text-default"
              title="Show where its souls drop"
              @click.stop="store.openPet(e.pet.id)"
            >
              <svg viewBox="0 0 16 16" class="size-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          </li>
        </template>
      </ul>

      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div class="min-h-0 flex-1">
          <WorldMap v-if="world" :world="world" :layers="layers" :focus="focus" :you="you" />
          <div v-else class="flex h-full items-center justify-center rounded-lg border border-card text-sm text-darker">
            None of these pets' soul monsters are on the map.
          </div>
        </div>
        <p class="text-[11px] text-darkest">
          <template v-if="world && !you">Your position shows here once the tracker knows it in {{ world.name }}. </template>
          Drop sources, spawns and maps:
          <a :href="spawns?.source" target="_blank" class="hover:text-default hover:underline">questlog.gg</a> ({{ spawns?.fetched }})
        </p>
      </div>
    </div>
  </div>
</template>
