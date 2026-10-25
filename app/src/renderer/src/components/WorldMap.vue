<script setup lang="ts">
// A zone map with spawn points: the zone image and an SVG layer of dots in one 1000x1000 "map
// space", moved and scaled as one. Wheel zooms around the pointer, dragging pans, and the view
// fits whatever `focus` is (the selected monster's spawns) whenever it changes. `marks` are single
// points with their own colour and a label on hover (addons' markers), drawn as small diamonds. A
// layer or mark may take another shape (lib/markShapes.ts: circle, square, diamond, triangle).
// With `follow`, the view keeps you in its middle, gliding there as you move, at the zoom you chose;
// dragging the map lets go of you (`unfollow`).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { shapePath } from '@/lib/markShapes.ts'
import { mapImage, project, type World } from '@/lib/spawns.ts'
import type { MarkShape } from '@shared/settings.ts'

export interface MapLayer {
  key: string | number
  points: [number, number][]
  color: string
  active: boolean
  /** Circles unless picked. */
  shape?: MarkShape
}

export interface MapMark {
  position: [number, number]
  color: string
  label: string | null
  /** Diamonds unless picked. */
  shape?: MarkShape
}

const props = defineProps<{
  world: World
  layers: MapLayer[]
  focus: [number, number][]
  you?: [number, number] | null
  marks?: MapMark[]
  follow?: boolean
  bare?: boolean
}>()
const emit = defineEmits<{ unfollow: [] }>()

const SIZE = 1000
const box = ref<HTMLElement | null>(null)
const view = ref({ k: 1, x: 0, y: 0 })
const loaded = ref(false)

const youXY = computed(() => (props.you ? project(props.world, props.you).map((v) => v * SIZE) : null))
const projected = computed(() =>
  props.layers.map((l) => ({ ...l, xy: l.points.map((p) => project(props.world, p).map((v) => v * SIZE) as [number, number]) })),
)
const marksXY = computed(() =>
  (props.marks ?? []).map((m) => ({ ...m, xy: project(props.world, m.position).map((v) => v * SIZE) as [number, number] })),
)

function boxSize(): { w: number; h: number } {
  const r = box.value?.getBoundingClientRect()
  return { w: r?.width || 400, h: r?.height || 300 }
}

type View = { k: number; x: number; y: number }

/** The view at zoom `k` with you in its middle. */
function onYou(k: number): View | null {
  const at = youXY.value
  if (!at) return null
  const { w, h } = boxSize()
  return { k, x: w / 2 - at[0]! * k, y: h / 2 - at[1]! * k }
}

/**
 * Glide to `to`: eased in and out from a standstill, eased out when already gliding (a new position
 * mid-glide), so the map keeps its pace instead of stopping and starting again.
 */
const GLIDE_MS = 800
let glide = 0
function stopGlide(): void {
  cancelAnimationFrame(glide)
  glide = 0
}
function glideTo(to: View): void {
  const moving = glide !== 0
  stopGlide()
  const from = { ...view.value }
  const t0 = performance.now()
  const ease = moving ? (t: number): number => 1 - (1 - t) ** 3 : (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
  const step = (now: number): void => {
    const t = Math.min(1, (now - t0) / GLIDE_MS)
    const e = ease(t)
    view.value = { k: from.k + (to.k - from.k) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }
    glide = t < 1 ? requestAnimationFrame(step) : 0
  }
  glide = requestAnimationFrame(step)
}

/** Fit the focus points (or the whole zone) into the box, with a margin; following, with you in the middle. */
function fit(): void {
  const { w, h } = boxSize()
  const pts = props.focus.map((p) => project(props.world, p).map((v) => v * SIZE))
  let [x0, y0, x1, y1] = [0, 0, SIZE, SIZE]
  if (pts.length) {
    x0 = Math.min(...pts.map((p) => p[0]!))
    x1 = Math.max(...pts.map((p) => p[0]!))
    y0 = Math.min(...pts.map((p) => p[1]!))
    y1 = Math.max(...pts.map((p) => p[1]!))
    // Never closer than a ninth of the zone, so a single spawn keeps some context around it.
    const minSpan = SIZE / 9
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const span = Math.max(x1 - x0, y1 - y0, minSpan) * 1.35
    ;[x0, x1, y0, y1] = [cx - span / 2, cx + span / 2, cy - span / 2, cy + span / 2]
  }
  const k = Math.min(w / (x1 - x0), h / (y1 - y0))
  stopGlide()
  view.value = (props.follow && onYou(k)) || { k, x: w / 2 - ((x0 + x1) / 2) * k, y: h / 2 - ((y0 + y1) / 2) * k }
}

function onWheel(e: WheelEvent): void {
  e.preventDefault()
  const r = box.value!.getBoundingClientRect()
  const px = e.clientX - r.left
  const py = e.clientY - r.top
  const { k, x, y } = view.value
  const { w, h } = boxSize()
  const minK = Math.min(w, h) / SIZE / 1.5
  const next = Math.min(40, Math.max(minK, k * Math.exp(-e.deltaY * 0.0015)))
  // Following, zoom around you (kept in the middle); else keep the map point under the pointer where it is.
  const centred = props.follow ? onYou(next) : null
  if (centred) stopGlide()
  view.value = centred ?? { k: next, x: px - ((px - x) / k) * next, y: py - ((py - y) / k) * next }
}

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const start = { ...view.value, px: e.clientX, py: e.clientY }
  const move = (ev: PointerEvent): void => {
    // Dragging the map away lets go of you (a click alone does not).
    if (props.follow && Math.hypot(ev.clientX - start.px, ev.clientY - start.py) > 3) {
      stopGlide()
      emit('unfollow')
    } else if (props.follow) return
    view.value = { k: start.k, x: start.x + ev.clientX - start.px, y: start.y + ev.clientY - start.py }
  }
  const up = (ev: PointerEvent): void => {
    el.releasePointerCapture(ev.pointerId)
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
}

watch(
  () => [props.world.key, props.focus] as const,
  ([key], [oldKey]) => {
    // Following in the same zone, another pet picked keeps your zoom and you in the middle.
    const to = props.follow && key === oldKey ? onYou(view.value.k) : null
    if (to) glideTo(to)
    else fit()
  },
  { deep: false },
)
// You moved, or following was switched on: glide to you at the zoom shown.
watch(
  () => [props.follow, youXY.value?.[0], youXY.value?.[1]] as const,
  () => {
    const to = props.follow ? onYou(view.value.k) : null
    if (to) glideTo(to)
  },
)
let observer: ResizeObserver | null = null
onMounted(() => {
  fit()
  // The panel grows when a map opens: fit again once the box has its new size.
  observer = new ResizeObserver(() => fit())
  if (box.value) observer.observe(box.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  stopGlide()
})

defineExpose({ fit })
</script>

<template>
  <div
    ref="box"
    :class="['relative h-full w-full cursor-grab touch-none overflow-hidden bg-[#c9bfa6] active:cursor-grabbing', bare ? '' : 'rounded-lg']"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @dblclick="fit"
  >
    <div
      class="absolute left-0 top-0 origin-top-left"
      :style="{ width: `${SIZE}px`, height: `${SIZE}px`, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }"
    >
      <img
        :src="mapImage(world)"
        alt=""
        draggable="false"
        class="absolute inset-0 size-full select-none"
        @load="loaded = true"
      />
      <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="absolute inset-0 size-full overflow-visible">
        <!-- Inactive layers first, so the selected monster's dots draw on top. -->
        <template v-for="layer in [...projected].sort((a, b) => Number(a.active) - Number(b.active))" :key="layer.key">
          <path
            v-for="(p, i) in layer.xy"
            :key="i"
            :d="shapePath(layer.shape ?? 'circle', p[0], p[1], (layer.active ? 5.5 : 3.5) / view.k)"
            :fill="layer.color"
            :fill-opacity="layer.active ? 0.95 : 0.55"
            stroke="#0e101d"
            :stroke-width="(layer.active ? 1.5 : 1) / view.k"
          />
        </template>
        <!-- Addons' markers: diamonds, apart from the spawns' dots, under you. -->
        <path
          v-for="(m, i) in marksXY"
          :key="`m${i}`"
          :d="shapePath(m.shape ?? 'diamond', m.xy[0], m.xy[1], 4.5 / view.k)"
          :fill="m.color"
          fill-opacity="0.95"
          stroke="#0e101d"
          :stroke-width="1.2 / view.k"
        >
          <title v-if="m.label">{{ m.label }}</title>
        </path>
        <!-- You: a ring with a dot, drawn last so nothing covers it. -->
        <g v-if="youXY">
          <circle :cx="youXY[0]" :cy="youXY[1]" :r="11 / view.k" fill="none" stroke="#ffffff" :stroke-width="3 / view.k" />
          <circle :cx="youXY[0]" :cy="youXY[1]" :r="11 / view.k" fill="none" stroke="#4f3cdd" :stroke-width="1.5 / view.k" />
          <circle :cx="youXY[0]" :cy="youXY[1]" :r="4 / view.k" fill="#ffffff" stroke="#4f3cdd" :stroke-width="1.5 / view.k" />
        </g>
      </svg>
    </div>
    <div v-if="!loaded" class="absolute inset-0 flex items-center justify-center text-xs text-black/60">Loading map…</div>
    <div v-if="!bare" class="pointer-events-none absolute bottom-1.5 right-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/80">
      scroll to zoom · drag to pan · double-click to fit
    </div>
  </div>
</template>
