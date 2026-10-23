<script setup lang="ts">
// The panel's resize grips, on its edges away from the bubble (main says which: the panel moves to
// the bubble's other side when the bubble crosses the middle of the screen). A transparent window
// cannot be resized by Windows itself, so these drag it: the pointer's travel on screen is the new
// size, sent to main, which keeps the panel beside the bubble and saves the size on release.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { bridge } from '@/lib/bridge.ts'
import type { PanelEdges } from '@shared/ipc.ts'

const edges = ref<PanelEdges>({ x: 'right', y: 'bottom' })
let off: (() => void) | null = null
onMounted(async () => {
  off = bridge().on('panel:edges', (e) => (edges.value = e))
  edges.value = await bridge().invoke('panel:edges')
})
onBeforeUnmount(() => off?.())

/** Which way each axis grows as the pointer moves right or down: -1 on the left or top edge. */
const sign = computed(() => ({ x: edges.value.x === 'left' ? -1 : 1, y: edges.value.y === 'top' ? -1 : 1 }))
const corner = computed(() => (sign.value.x === sign.value.y ? 'cursor-nwse-resize' : 'cursor-nesw-resize'))

function start(e: PointerEvent, axes: { x: boolean; y: boolean }): void {
  if (e.button !== 0) return
  e.preventDefault()
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const from = { x: e.screenX, y: e.screenY, width: window.innerWidth, height: window.innerHeight }
  const { x: sx, y: sy } = sign.value
  let frame = 0
  let last: PointerEvent = e
  const size = (ev: PointerEvent): { width: number; height: number } => ({
    width: axes.x ? from.width + (ev.screenX - from.x) * sx : from.width,
    height: axes.y ? from.height + (ev.screenY - from.y) * sy : from.height,
  })
  const flush = (): void => {
    frame = 0
    void bridge().invoke('panel:resize', size(last), false)
  }
  const onMove = (ev: PointerEvent): void => {
    last = ev
    frame ||= requestAnimationFrame(flush)
  }
  const onUp = (ev: PointerEvent): void => {
    el.releasePointerCapture(ev.pointerId)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    if (frame) cancelAnimationFrame(frame)
    void bridge().invoke('panel:resize', size(ev), true)
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
}
</script>

<template>
  <div
    :class="['absolute inset-y-0 z-50 w-1.5 cursor-ew-resize', edges.x === 'left' ? 'left-0' : 'right-0']"
    @pointerdown="start($event, { x: true, y: false })"
  />
  <div
    :class="['absolute inset-x-0 z-50 h-1.5 cursor-ns-resize', edges.y === 'top' ? 'top-0' : 'bottom-0']"
    @pointerdown="start($event, { x: false, y: true })"
  />
  <div
    :class="['absolute z-50 size-3', corner, edges.x === 'left' ? 'left-0' : 'right-0', edges.y === 'top' ? 'top-0' : 'bottom-0']"
    title="Drag to resize"
    @pointerdown="start($event, { x: true, y: true })"
  />
</template>
