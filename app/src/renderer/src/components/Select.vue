<script setup lang="ts" generic="T extends string | number">
// A dropdown in the app's colours, in place of the native <select> whose menu Windows draws white.
// The trigger is a field with the chosen label and a chevron, or whatever the default slot holds
// (the timers' speaker icon), styled by the caller (`aria-expanded:` for its open look); class and
// title on it go to the trigger. The menu is teleported to
// the body, so a list that clips what overflows it does not cut it off, and opens below the
// trigger or above when the window is short there. Keyboard: arrows, Home/End, Enter, Escape.
import { computed, nextTick, onBeforeUnmount, ref, useSlots } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    modelValue: T | undefined
    options: readonly { value: T; label: string }[]
    size?: 'xs' | 'sm' | 'md'
    disabled?: boolean
  }>(),
  { size: 'sm', disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
const slots = useSlots()

const SIZES = { xs: 'h-6 pl-1.5 pr-1 text-[11px]', sm: 'h-7 pl-2 pr-1.5 text-sm', md: 'h-8 pl-2 pr-1.5 text-sm' }
const ITEM = { xs: 'px-1.5 py-1 text-[11px]', sm: 'px-2 py-1.5 text-sm', md: 'px-2 py-1.5 text-sm' }

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))
const open = ref(false)
const pos = ref({ top: 0, left: 0, minWidth: 0 })
const trigger = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)

const items = (): HTMLElement[] => [...(menu.value?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]

async function show(): Promise<void> {
  if (props.disabled || !trigger.value) return
  const r = trigger.value.getBoundingClientRect()
  pos.value = { top: r.bottom + 4, left: r.left, minWidth: r.width }
  open.value = true
  await nextTick()
  const m = menu.value
  if (!m) return
  // Keep it in the window: flip above when it does not fit below, and slide in from the right edge.
  const h = m.offsetHeight
  const w = m.offsetWidth
  const top = r.bottom + 4 + h > window.innerHeight - 4 ? Math.max(4, r.top - 4 - h) : r.bottom + 4
  const left = Math.max(4, Math.min(r.left, window.innerWidth - 4 - w))
  pos.value = { top, left, minWidth: r.width }
  ;(items().find((el) => el.getAttribute('aria-selected') === 'true') ?? items()[0])?.focus()
  document.addEventListener('pointerdown', outside, true)
  window.addEventListener('scroll', scrolled, true)
  window.addEventListener('resize', dismiss)
  window.addEventListener('blur', dismiss)
}
function hide(refocus = false): void {
  if (!open.value) return
  open.value = false
  document.removeEventListener('pointerdown', outside, true)
  window.removeEventListener('scroll', scrolled, true)
  window.removeEventListener('resize', dismiss)
  window.removeEventListener('blur', dismiss)
  if (refocus) trigger.value?.focus()
}
/** Closes without taking focus back: the window resized or lost focus. */
const dismiss = (): void => hide()
onBeforeUnmount(dismiss)

function outside(ev: PointerEvent): void {
  const t = ev.target as Node
  if (!menu.value?.contains(t) && !trigger.value?.contains(t)) hide()
}
/** The page scrolling under the menu would leave it behind; its own scrolling is fine. */
function scrolled(ev: Event): void {
  if (!menu.value?.contains(ev.target as Node)) hide()
}

function pick(value: T): void {
  hide(true)
  if (value !== props.modelValue) emit('update:modelValue', value)
}

function triggerKey(ev: KeyboardEvent): void {
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault()
    void show()
  }
}
function menuKey(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') {
    ev.preventDefault()
    return hide(true)
  }
  if (ev.key === 'Tab') return hide()
  const list = items()
  const i = list.indexOf(document.activeElement as HTMLElement)
  const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[ev.key]
  if (to === undefined) return
  ev.preventDefault()
  list[(to + list.length) % list.length]?.focus()
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    v-bind="$attrs"
    :disabled="disabled"
    aria-haspopup="listbox"
    :aria-expanded="open"
    :class="
      !slots.default && [
        'inline-flex items-center justify-between gap-1 rounded-md border border-light bg-default text-left transition-colors',
        'hover:border-lighter aria-expanded:border-accent disabled:opacity-50',
        SIZES[size],
      ]
    "
    @click="open ? hide() : show()"
    @keydown="triggerKey"
  >
    <slot>
      <span class="truncate">{{ selected?.label ?? '' }}</span>
      <svg
        viewBox="0 0 16 16"
        :class="['size-3.5 shrink-0 text-darker transition-transform', open && 'rotate-180']"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path d="m4.5 6.5 3.5 3.5 3.5-3.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </slot>
  </button>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        ref="menu"
        role="listbox"
        class="fixed z-50 max-h-64 overflow-y-auto rounded-lg border border-card bg-card p-1 shadow-card"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px`, minWidth: `${pos.minWidth}px` }"
        @keydown="menuKey"
      >
        <button
          v-for="o in options"
          :key="o.value"
          type="button"
          role="option"
          :aria-selected="o.value === modelValue"
          :class="[
            'flex w-full items-center gap-2 whitespace-nowrap rounded-md text-left outline-none hover:bg-light focus-visible:bg-light focus:bg-light',
            ITEM[size],
            o.value === modelValue ? 'text-accent' : 'text-default',
          ]"
          @click="pick(o.value)"
        >
          <span class="flex-1">{{ o.label }}</span>
          <svg
            viewBox="0 0 16 16"
            :class="['size-3.5 shrink-0', o.value !== modelValue && 'invisible']"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <path d="m3.5 8.5 3 3 6-7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
