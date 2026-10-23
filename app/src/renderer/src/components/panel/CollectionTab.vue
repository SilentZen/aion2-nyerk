<script setup lang="ts">
// Every pet: search, sort, filter. Click a name or a soul count to correct it; the pin puts a pet
// on the HUD (in pinned mode).
import { computed, nextTick, onBeforeUnmount, ref, toRefs } from 'vue'
import GenusPill, { GENUS_PILL } from '@/components/GenusPill.vue'
import LevelBadge from '@/components/LevelBadge.vue'
import LevelBar from '@/components/LevelBar.vue'
import PetIcon from '@/components/PetIcon.vue'
import Select from '@/components/Select.vue'
import { bridge } from '@/lib/bridge.ts'
import { useCollectionList } from '@/lib/collectionList.ts'
import { CONTINENTS, formatDistance, type NearbyPet } from '@/lib/spawns.ts'
import { displayName, GENERA, monsterName, PET_DB_DATE, PET_DB_SIZE, PET_DB_SOURCE, petInfo } from '@/lib/petDb.ts'
import { useApp } from '@/stores/app.ts'
import { MAX_LEVEL, nextLevelSouls, type Pet } from '@shared/tracker.ts'

const store = useApp()
// In the store, so they survive the tab being rebuilt (after a pet's map closes).
const { query, sort, filter, genus, continent } = toRefs(store.collectionView)
const SORTS: { value: typeof sort.value; label: string }[] = [
  { value: 'souls', label: 'Most souls' },
  { value: 'level', label: 'Level' },
  { value: 'name', label: 'Name' },
  { value: 'recent', label: 'This session' },
  { value: 'range', label: 'Range' },
]

const FILTERS = [
  { id: 'unfinished', label: `Below Lv${MAX_LEVEL}` },
  { id: 'session', label: 'This session' },
  { id: 'pinned', label: 'Pinned' },
] as const

/** Turns a pill on or off in its group. */
function toggle<T>(group: T[], id: T): void {
  const i = group.indexOf(id)
  if (i >= 0) group.splice(i, 1)
  else group.push(id)
}

const { spawns, genusCounts, continentCounts, here, distance, near, pinned, nearbyOn, list } = useCollectionList()

// How old the position is, said the way people do; ticks so it ages while the panel is open.
const now = ref(Date.now())
const ticker = setInterval(() => (now.value = Date.now()), 15_000)
onBeforeUnmount(() => clearInterval(ticker))
const positionAge = computed(() => {
  const at = store.nearby.positionAt
  if (!at) return 'as last seen'
  const min = Math.floor((now.value - at) / 60_000)
  return min < 1 ? 'updated just now' : min < 60 ? `updated ${min} min ago` : `updated ${Math.floor(min / 60)} h ago`
})
/** The soul monsters around you, by name: what you actually see in the game. */
const nearMonsters = computed(() => {
  const seen = new Map<number, { name: string; count: number }>()
  for (const n of near.value.values()) for (const m of n.monsters) seen.set(m.npc, { name: m.name, count: m.count })
  return [...seen.values()].sort((a, b) => b.count - a.count)
})
const nearLine = (n: NearbyPet): string =>
  n.monsters.map((m) => `${m.count > 1 ? `${m.count}× ` : ''}${m.name} (Lv${m.level})`).join(', ')

const hiddenCount = computed(() => (query.value.trim() ? 0 : store.pets.filter((p) => store.hiddenPet(p.id)).length))
const totals = computed(() => ({
  pets: store.pets.length,
  souls: store.pets.reduce((n, p) => n + p.souls, 0),
  maxed: store.pets.filter((p) => p.level >= MAX_LEVEL).length,
}))

// Inline editing: one field at a time.
const editing = ref<{ id: number; field: 'name' | 'souls'; value: string } | null>(null)
const input = ref<HTMLInputElement[] | null>(null)
async function edit(pet: Pet, field: 'name' | 'souls'): Promise<void> {
  editing.value = { id: pet.id, field, value: field === 'name' ? (pet.name ?? '') : String(pet.souls) }
  await nextTick()
  input.value?.[0]?.select()
}
function commit(): void {
  const e = editing.value
  editing.value = null
  if (!e) return
  if (e.field === 'souls') {
    const n = Number(e.value)
    if (Number.isInteger(n) && n >= 0) void bridge().invoke('tracker:setSouls', e.id, n)
  } else if (e.value.trim()) {
    void bridge().invoke('tracker:setName', e.id, e.value.trim())
  }
}
</script>

<template>
  <div class="space-y-3 p-3">
    <div
      v-if="!store.status?.synced && store.pets.every((p) => p.levelEstimated)"
      class="rounded-lg border border-accent/40 bg-accent-soft/60 px-3 py-2 text-xs leading-relaxed text-dark"
    >
      Counts load from the server when you enter the world. Log in (or go to character select and back) while the
      tracker runs to sync every pet.
    </div>

    <button
      type="button"
      :class="[
        'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition',
        nearbyOn ? 'border-green/60 bg-green/10' : 'border-card bg-card hover:border-light',
      ]"
      :title="nearbyOn ? 'Show all pets' : 'Show the pets whose soul monsters are around you'"
      @click="toggle(filter, 'nearby')"
    >
      <span :class="['size-2 shrink-0 rounded-full', near.size ? 'bg-green shadow-[0_0_6px] shadow-green' : 'bg-darkest']" />
      <span class="font-semibold">Nearby</span>
      <span v-if="near.size" class="min-w-0 truncate text-xs text-darker">
        {{ nearMonsters.slice(0, 3).map((m) => `${m.name} ${m.count}`).join(' · ') }}
      </span>
      <span v-else class="text-xs text-darkest">no soul monsters around you</span>
      <span class="ml-auto shrink-0 rounded-full bg-green/15 px-2 text-xs font-semibold tabular-nums text-green">{{ near.size }}</span>
    </button>

    <div class="grid grid-cols-3 gap-2 text-center">
      <div class="rounded-lg bg-card px-2 py-1.5">
        <div class="text-lg font-semibold tabular-nums">{{ totals.pets }}</div>
        <div class="text-[11px] text-darker">pets</div>
      </div>
      <div class="rounded-lg bg-card px-2 py-1.5">
        <div class="text-lg font-semibold tabular-nums">{{ totals.souls }}</div>
        <div class="text-[11px] text-darker">souls</div>
      </div>
      <div class="rounded-lg bg-card px-2 py-1.5">
        <div class="text-lg font-semibold tabular-nums">{{ totals.maxed }}</div>
        <div class="text-[11px] text-darker">at Lv{{ MAX_LEVEL }}</div>
      </div>
    </div>

    <div class="flex gap-2">
      <input
        v-model="query"
        type="search"
        placeholder="Search pets, monsters, genus or #id"
        class="h-8 min-w-0 flex-1 rounded-md border border-light bg-default px-2.5 text-sm placeholder:text-darkest focus:border-accent"
      />
      <Select v-model="sort" :options="SORTS" size="md" title="Sort" />
      <button
        type="button"
        class="flex size-8 shrink-0 items-center justify-center rounded-md border border-light bg-default text-darker transition hover:border-accent hover:text-accent"
        title="Show these pets on the map"
        @click="store.showCollectionMap()"
      >
        <svg viewBox="0 0 16 16" class="size-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
          <path d="M1.5 3.5l4-1.5 5 1.5 4-1.5v10.5l-4 1.5-5-1.5-4 1.5z M5.5 2v10.5 M10.5 3.5V14" />
        </svg>
      </button>
    </div>
    <!-- The filters, one segment per group: what to show, then continent, then genus. -->
    <div class="divide-y divide-[color:var(--gray-4)] rounded-lg border border-card bg-card">
      <div class="flex items-start gap-2 px-2.5 py-2">
        <span class="w-16 shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-wide text-darkest">Show</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            :class="[
              'rounded-full border px-2.5 py-0.5 text-xs transition',
              !filter.length ? 'border-accent bg-accent-soft text-accent' : 'border-light text-darker hover:text-default',
            ]"
            @click="filter.splice(0)"
          >
            All
          </button>
          <button
            v-for="f in FILTERS"
            :key="f.id"
            type="button"
            :class="[
              'rounded-full border px-2.5 py-0.5 text-xs transition',
              filter.includes(f.id) ? 'border-accent bg-accent-soft text-accent' : 'border-light text-darker hover:text-default',
            ]"
            @click="toggle(filter, f.id)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>
      <div class="flex items-start gap-2 px-2.5 py-2">
        <span class="w-16 shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-wide text-darkest">Continent</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            :class="[
              'rounded-full border px-2.5 py-0.5 text-xs transition',
              !continent.length ? 'border-accent bg-accent-soft text-accent' : 'border-light text-darker hover:text-default',
            ]"
            @click="continent.splice(0)"
          >
            All
          </button>
          <button
            v-for="c in CONTINENTS"
            :key="c.id"
            type="button"
            :class="[
              'rounded-full border px-2.5 py-0.5 text-xs transition',
              continent.includes(c.id) ? 'border-accent bg-accent-soft text-accent' : 'border-light text-darker hover:text-default',
            ]"
            :title="`Alone: pets only found ${c.label === 'Abyss' ? 'in the Abyss' : `in ${c.label} zones`}. With other continents: pets found on all of them and nowhere else`"
            @click="toggle(continent, c.id)"
          >
            {{ c.label }} <span class="tabular-nums opacity-60">{{ continentCounts.get(c.id) ?? 0 }}</span>
          </button>
        </div>
      </div>
      <div class="flex items-start gap-2 px-2.5 py-2">
        <span class="w-16 shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-wide text-darkest">Genus</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            :class="[
              'rounded-full border px-2.5 py-0.5 text-xs transition',
              !genus.length ? 'border-accent bg-accent-soft text-accent' : 'border-light text-darker hover:text-default',
            ]"
            @click="genus.splice(0)"
          >
            All
          </button>
          <button
            v-for="g in GENERA"
            :key="g.id"
            type="button"
            :class="[
              'rounded-full border px-2.5 py-0.5 text-xs transition',
              genus.includes(g.id) ? GENUS_PILL[g.id] : 'border-light text-darker hover:text-default',
            ]"
            @click="toggle(genus, g.id)"
          >
            {{ g.label }} <span class="tabular-nums opacity-60">{{ genusCounts.get(g.id) ?? 0 }}</span>
          </button>
        </div>
      </div>
    </div>
    <p v-if="sort === 'range' && !here" class="-mt-1 text-[11px] text-darkest">
      Range needs your position: the tracker learns it when you enter a zone, teleport or fight.
    </p>
    <p v-else-if="sort === 'range' && here" class="-mt-1 text-[11px] text-darkest">
      Range from your position in {{ spawns?.worlds[here.world]?.name ?? 'this zone' }}, {{ positionAge }}. It updates
      when you enter a zone, teleport or fight.
    </p>

    <ul class="divide-y divide-[color:var(--gray-4)] overflow-hidden rounded-lg border border-card bg-card">
      <li
        v-for="pet in list"
        :key="pet.id"
        class="group flex cursor-pointer gap-2.5 px-3 py-2 transition hover:bg-dark"
        title="Show where its souls drop"
        @click="store.showPetMap(pet.id)"
      >
        <PetIcon :id="pet.id" :size="38" class="mt-0.5" />
        <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <div class="flex min-w-0 flex-1 items-center gap-1.5">
            <input
              v-if="editing?.id === pet.id && editing.field === 'name'"
              ref="input"
              v-model="editing.value"
              class="h-6 w-full rounded border border-accent bg-default px-1.5 text-sm"
              placeholder="Monster name"
              @click.stop
              @keydown.enter="commit"
              @keydown.esc.stop="editing = null"
              @blur="commit"
            />
            <template v-else>
              <!-- A pet the database knows has its name; only an unknown one is named by hand. -->
              <span v-if="petInfo(pet.id)" class="truncate text-sm font-medium" :title="`Pet #${pet.id}`">
                {{ displayName(pet) }}
              </span>
              <button
                v-else
                type="button"
                :class="['truncate text-left text-sm', pet.name ? 'font-medium' : 'italic text-darker']"
                title="Not in the pet database: click to name it"
                @click.stop="edit(pet, 'name')"
              >
                {{ displayName(pet) }}
              </button>
              <GenusPill :id="pet.id" />
            </template>
          </div>
          <span v-if="pet.session" class="text-xs tabular-nums text-green">+{{ pet.session }}</span>
          <input
            v-if="editing?.id === pet.id && editing.field === 'souls'"
            ref="input"
            v-model="editing.value"
            inputmode="numeric"
            class="h-6 w-14 rounded border border-accent bg-default px-1.5 text-right text-sm tabular-nums"
            @click.stop
              @keydown.enter="commit"
            @keydown.esc.stop="editing = null"
            @blur="commit"
          />
          <button
            v-else
            type="button"
            class="w-10 text-right text-sm font-semibold tabular-nums hover:text-accent"
            title="Click to correct the count"
            @click.stop="edit(pet, 'souls')"
          >
            {{ pet.souls }}
          </button>
          <LevelBadge :pet="pet" />
          <button
            type="button"
            :title="pinned.has(pet.id) ? 'Unpin from the HUD' : 'Pin to the HUD'"
            :class="[
              'flex size-6 items-center justify-center rounded transition',
              pinned.has(pet.id) ? 'text-accent' : 'text-darkest opacity-0 hover:text-default group-hover:opacity-100',
            ]"
            @click.stop="store.togglePin(pet.id)"
          >
            <svg viewBox="0 0 16 16" class="size-3.5" :fill="pinned.has(pet.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.4">
              <path d="M6 2h4l-.5 4 2.5 2.5H4L6.5 6z M8 8.5V14" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <div v-if="near.get(pet.id)" class="truncate text-[11px] text-green" :title="nearLine(near.get(pet.id)!)">
          nearby: {{ nearLine(near.get(pet.id)!) }}
        </div>
        <div v-else-if="monsterName(pet) || (sort === 'range' && distance(pet.id) !== null)" class="truncate text-[11px] text-darkest">
          <template v-if="sort === 'range' && distance(pet.id) !== null">{{ formatDistance(distance(pet.id)!) }} away</template>
          <template v-if="sort === 'range' && distance(pet.id) !== null && monsterName(pet)"> · </template>
          <template v-if="monsterName(pet)">from {{ monsterName(pet) }}</template>
        </div>
        <div class="mt-1 flex items-center gap-2">
          <LevelBar :pet="pet" class="flex-1" />
          <span class="w-20 text-right text-[11px] tabular-nums text-darkest">
            <template v-if="nextLevelSouls(pet) !== null">{{ pet.souls }} / {{ nextLevelSouls(pet) }}</template>
            <template v-else>max{{ pet.crystals ? ` · ${pet.crystals} crystals` : '' }}</template>
          </span>
        </div>
        </div>
      </li>
      <li v-if="hiddenCount" class="px-3 py-2 text-center text-[11px] text-darkest">
        {{ hiddenCount }} maxed (Lv3) pet{{ hiddenCount === 1 ? '' : 's' }} hidden: search finds them, or turn this off in Settings.
      </li>
      <li v-if="!list.length" class="px-3 py-6 text-center text-sm text-darker">
        {{ store.pets.length ? 'No pets match.' : 'No pets yet: they appear when souls drop, or on the next login sync.' }}
      </li>
    </ul>
    <p class="text-center text-[11px] text-darkest">
      Pet names, genus and portraits:
      <a :href="PET_DB_SOURCE" target="_blank" class="hover:text-default hover:underline">questlog.gg</a>
      ({{ PET_DB_SIZE }} pets, {{ PET_DB_DATE }})
    </p>
  </div>
</template>
