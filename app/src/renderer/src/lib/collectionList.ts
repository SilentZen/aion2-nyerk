/**
 * The collection as its filters show it: search, Show / continent / genus pills and sort, from
 * the store's collectionView. Shared by the Collection tab and its map, so both show the same pets.
 */
import { computed, toRefs } from 'vue'
import { nearbyPets, petContinents, petDistance, useSpawns, type NearbyPet } from '@/lib/spawns.ts'
import { displayName, GENUS_LABEL, petInfo, type Genus } from '@/lib/petDb.ts'
import { useApp } from '@/stores/app.ts'
import { blankPet, MAX_LEVEL, totalSouls, type Pet } from '@shared/tracker.ts'

export function useCollectionList() {
  const store = useApp()
  const { query, sort, filter, genus, continent } = toRefs(store.collectionView)

  // Around you: the pets whose soul monsters the tracker sees loaded near you.
  const spawns = useSpawns()

  /** The continents each pet's soul monsters spawn on (Elyos, Asmodian, Abyss). */
  const continents = computed(() => (spawns.value ? petContinents(spawns.value) : new Map<number, Set<string>>()))
  /**
   * The pet is found on exactly the chosen continents: one pill is the pets only found there,
   * Elyos + Asmodian the pets found on both and not in the Abyss.
   */
  const onContinent = (id: number): boolean => {
    const chosen = continent.value
    if (!chosen.length) return true
    const on = continents.value.get(id)
    return !!on && on.size === chosen.length && chosen.every((c) => on.has(c))
  }
  // A pet has one genus, so several genus pills show any of them.
  const ofGenus = (id: number): boolean => !genus.value.length || genus.value.includes(petInfo(id)?.genus as Genus)

  /** Pets per genus on the chosen continents, for the genus chips. */
  const genusCounts = computed(() => {
    const counts = new Map<Genus, number>()
    for (const p of store.pets) {
      const g = petInfo(p.id)?.genus
      if (g && onContinent(p.id)) counts.set(g, (counts.get(g) ?? 0) + 1)
    }
    return counts
  })
  /** Pets of the chosen genera found only on each continent, for the continent chips. */
  const continentCounts = computed(() => {
    const counts = new Map<string, number>()
    for (const p of store.pets) {
      if (!ofGenus(p.id)) continue
      const on = continents.value.get(p.id)
      if (on?.size === 1) for (const c of on) counts.set(c, (counts.get(c) ?? 0) + 1)
    }
    return counts
  })

  /**
   * Range: how far your last known position is from each pet's nearest soul monster spawn in your
   * zone. The tracker learns the position on entering a zone, teleporting, and from your own skills;
   * null for a pet with no spawns in your zone, or while the position is not known. The zone is the
   * tracker's (Nearby's `world`), as everything else takes it.
   */
  const here = computed(() => {
    const world = store.nearby.world
    return world !== null && store.nearby.position ? { world, at: store.nearby.position } : null
  })
  const distance = (id: number): number | null =>
    spawns.value && here.value ? petDistance(spawns.value, id, here.value.world, here.value.at) : null
  const near = computed(
    () =>
      new Map<number, NearbyPet>(
        (spawns.value ? nearbyPets(store.nearby, spawns.value) : []).filter((n) => !store.hiddenPet(n.pet)).map((n) => [n.pet, n]),
      ),
  )

  const pinned = computed(() => new Set(store.settings.hud.pinned))
  const nearbyOn = computed(() => filter.value.includes('nearby'))
  const list = computed(() => {
    const q = query.value.trim().toLowerCase()
    // A pet nearby that the collection has never seen (no souls yet) still belongs in the list.
    const known = new Set(store.pets.map((p) => p.id))
    const unseen: Pet[] = [...near.value.keys()]
      .filter((id) => !known.has(id))
      .map((id) => blankPet(id))
    let out = [...store.pets, ...(nearbyOn.value ? unseen : [])].filter((p) => {
      // Maxed pets are left out when the setting says so, unless searched for by name.
      if (!q && store.hiddenPet(p.id)) return false
      // The Show pills combine: each one narrows the list further.
      const show = filter.value
      if (show.includes('nearby') && !near.value.has(p.id)) return false
      if (show.includes('pinned') && !pinned.value.has(p.id)) return false
      if (show.includes('unfinished') && p.level >= MAX_LEVEL) return false
      if (show.includes('session') && !p.session) return false
      const info = petInfo(p.id)
      if (!ofGenus(p.id) || !onContinent(p.id)) return false
      if (!q) return true
      const haystack = [displayName(p), p.name ?? '', info ? GENUS_LABEL[info.genus] : '', String(p.id)]
      return haystack.some((h) => h.toLowerCase().includes(q))
    })
    const by: Record<typeof sort.value, (a: Pet, b: Pet) => number> = {
      souls: (a, b) => totalSouls(b) - totalSouls(a),
      name: (a, b) => displayName(a).localeCompare(displayName(b)),
      level: (a, b) => b.level - a.level || totalSouls(b) - totalSouls(a),
      recent: (a, b) => b.session - a.session || totalSouls(b) - totalSouls(a),
      // Nearest first; pets with no spawn in your zone after them, by souls.
      range: (a, b) => {
        const da = distance(a.id)
        const db = distance(b.id)
        if (da !== null && db !== null) return da - db
        return (da === null ? 1 : 0) - (db === null ? 1 : 0) || totalSouls(b) - totalSouls(a)
      },
    }
    const nearFirst = (a: Pet, b: Pet): number =>
      nearbyOn.value ? (near.value.get(b.id)?.count ?? 0) - (near.value.get(a.id)?.count ?? 0) : 0
    out = [...out].sort((a, b) => nearFirst(a, b) || by[sort.value](a, b) || a.id - b.id)
    return out
  })

  return { spawns, genusCounts, continentCounts, here, distance, near, pinned, nearbyOn, list }
}
