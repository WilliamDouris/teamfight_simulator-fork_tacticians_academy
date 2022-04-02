import type { HexCoord } from '#/common/types'

import { BOARD_COL_COUNT, BOARD_ROW_COUNT, BOARD_ROW_PER_SIDE_COUNT } from '#/sim/helpers/constants'

export function getInverseHex(hex: HexCoord): HexCoord {
	return [BOARD_COL_COUNT - hex[0] - 1, BOARD_ROW_COUNT - hex[1] - 1]
}
export function getMirrorHex(hex: HexCoord): HexCoord {
	return hex[1] >= BOARD_ROW_PER_SIDE_COUNT ? getInverseHex(hex) : hex
}

export function isSameHex(a: HexCoord | null, b: HexCoord | null) {
	if (!a || !b) {
		return false
	}
	return a[0] === b[0] && a[1] === b[1]
}

export function containsHex(targetHex: HexCoord, hexes: Iterable<HexCoord>) {
	for (const hex of hexes) {
		if (isSameHex(targetHex, hex)) {
			return true
		}
	}
	return false
}
