/**
 * The shapes markers take on the maps (shared/settings.ts MARK_SHAPES), as SVG paths of about the
 * same visual weight: `r` is a circle's radius, and the others are sized to look as big.
 */
import type { MarkShape } from '@shared/settings.ts'

export function shapePath(shape: MarkShape, x: number, y: number, r: number): string {
  switch (shape) {
    case 'circle':
      return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
    case 'square': {
      const h = r * 0.9
      return `M${x - h} ${y - h}h${2 * h}v${2 * h}h${-2 * h}Z`
    }
    case 'diamond': {
      const h = r * 1.25
      return `M${x} ${y - h}l${h} ${h}l${-h} ${h}l${-h} ${-h}Z`
    }
    case 'triangle': {
      const h = r * 1.35
      return `M${x} ${y - h}L${x + h * 0.95} ${y + h * 0.65}L${x - h * 0.95} ${y + h * 0.65}Z`
    }
  }
}
