<script setup lang="ts">
// A marker's swatch on the Collection Map, in its colour and shape; clicking it picks another of
// each (or back to the map's own). The menu is teleported to the body like Select's, so the list
// it sits in does not clip it, and closes on a click outside, Escape, or the window losing focus.
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { shapePath } from '@/lib/markShapes.ts'
import { MARK_SHAPES, type MarkShape, type MarkStyle } from '@shared/settings.ts'

const props = defineProps<{
  /** What it looks like now (picked or the map's own). */
  color: string
  shape: MarkShape
  /** What was picked, if anything: Reset shows only then. */
  picked: MarkStyle | null
  title?: string
}>()
const emit = defineEmits<{ change: [style: MarkStyle | null] }>()

const COLORS = ['#f76b15', '#e54666', '#ffc53d', '#30a46c', '#3dd68c', '#12a594', '#0090ff', '#70b8ff', '#ab4aba', '#a3acff', '#8e8c99', '#ffffff']
const SHAPE_LABEL: Record<MarkShape, string> = { circle: 'Circle', square: 'Square', diamond: 'Diamond', triangle: 'Triangle' }

const open = ref(false)
const pos = ref({ top: 0, left: 0 })
const trigger = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)

async function show(): Promise<void> {
  if (!trigger.value) return
  const r = trigger.value.getBoundingClientRect()
  pos.value = { top: r.bottom + 4, left: r.left }
  open.value = true
  await nextTick()
  const m = menu.value
  if (!m) return
  // Keep it in the window: above when it does not fit below, slid in from the right edge.
  const top = r.bottom + 4 + m.offsetHeight > window.innerHeight - 4 ? Math.max(4, r.top - 4 - m.offsetHeight) : r.bottom + 4
  pos.value = { top, left: Math.max(4, Math.min(r.left, window.innerWidth - 4 - m.offsetWidth)) }
  document.addEventListener('pointerdown', outside, true)
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('blur', hide)
}
function hide(): void {
  if (!open.value) return
  open.value = false
  document.removeEventListener('pointerdown', outside, true)
  window.removeEventListener('keydown', onKey, true)
  window.removeEventListener('blur', hide)
}
/** Escape closes the menu only, not the map window around it. */
function onKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  e.stopImmediatePropagation()
  hide()
}
function outside(e: PointerEvent): void {
  const t = e.target as Node
  if (!menu.value?.contains(t) && !trigger.value?.contains(t)) hide()
}
onBeforeUnmount(hide)

function pick(change: Partial<MarkStyle>): void {
  const next = { color: props.picked?.color ?? null, shape: props.picked?.shape ?? null, ...change }
  emit('change', next.color === null && next.shape === null ? null : next)
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    :title="title ?? 'Colour and shape on the map'"
    class="flex size-4 shrink-0 items-center justify-center rounded transition hover:bg-light"
    :aria-expanded="open"
    @click.stop="open ? hide() : show()"
    @pointerdown.stop
    @dblclick.stop
  >
    <svg viewBox="0 0 16 16" class="size-3.5">
      <path :d="shapePath(shape, 8, 8, 5)" :fill="color" stroke="#0e101d" stroke-width="1" />
    </svg>
  </button>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menu"
      class="fixed z-50 w-[168px] rounded-lg border border-card bg-card p-2 shadow-card"
      :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
      @click.stop
      @pointerdown.stop
    >
      <div class="grid grid-cols-6 gap-1">
        <button
          v-for="c in COLORS"
          :key="c"
          type="button"
          :title="c"
          :class="['size-5 rounded-full border-2 transition', c === color ? 'border-white' : 'border-transparent hover:border-white/50']"
          :style="{ background: c }"
          @click="pick({ color: c })"
        />
      </div>
      <div class="mt-2 grid grid-cols-4 gap-1">
        <button
          v-for="s in MARK_SHAPES"
          :key="s"
          type="button"
          :title="SHAPE_LABEL[s]"
          :class="['flex h-6 items-center justify-center rounded transition', s === shape ? 'bg-light' : 'hover:bg-light/60']"
          @click="pick({ shape: s })"
        >
          <svg viewBox="0 0 16 16" class="size-4">
            <path :d="shapePath(s, 8, 8, 5)" :fill="color" stroke="#0e101d" stroke-width="1" />
          </svg>
        </button>
      </div>
      <button
        v-if="picked"
        type="button"
        class="mt-2 w-full rounded px-1 py-1 text-left text-[11px] text-darker transition hover:bg-light hover:text-default"
        @click="emit('change', null), hide()"
      >
        Reset to the map's own
      </button>
    </div>
  </Teleport>
</template>
