import { BOARD_COL_COUNT, BOARD_ROW_COUNT } from '#/game/constants'
import type { HexCoord } from '#/game/types'
import type { UnitData } from '#/game/unit'

const lastCol = BOARD_COL_COUNT - 1
const lastRow = BOARD_ROW_COUNT - 1

export function getSurrounding([col, row]: HexCoord) {
	const validHexes: HexCoord[] = []
	if (col < lastCol) {
		validHexes.push([col + 1, row])
	}
	if (col > 0) {
		validHexes.push([col - 1, row])
	}
	const isOffsetRow = row % 2 === 1
	if (col > (isOffsetRow ? -1 : 0)) {
		const lookLeft = isOffsetRow ? 0 : -1
		if (row > 0) {
			validHexes.push([col + lookLeft, row - 1])
		}
		if (row < lastRow) {
			validHexes.push([col + lookLeft, row + 1])
		}
	}
	if (col < lastCol + (isOffsetRow ? 0 : 1)) {
		const lookRight = isOffsetRow ? 1 : 0
		if (row > 0) {
			validHexes.push([col + lookRight, row - 1])
		}
		if (row < lastRow) {
			validHexes.push([col + lookRight, row + 1])
		}
	}
	return validHexes
}

export function isSameHex(a: HexCoord, b: HexCoord) {
	return a[0] === b[0] && a[1] === b[1]
}

export function containsHex(targetHex: HexCoord, hexes: HexCoord[]) {
	for (const hex of hexes) {
		if (isSameHex(targetHex, hex)) {
			return true
		}
	}
	return false
}

export function getNearestEnemies(unit: UnitData, allUnits: UnitData[], range?: number) {
	let currentRange = 0
	if (range == null) {
		range = unit.range()
	}
	let checkHexes = [unit.currentPosition()]
	const checkedHexes: HexCoord[] = [unit.currentPosition()]
	const enemies: UnitData[] = []
	while (checkHexes.length && !enemies.length) {
		const visitedHexes: HexCoord[] = []
		for (const checkHex of checkHexes) {
			for (const surroundingHex of getSurrounding(checkHex)) {
				if (!containsHex(surroundingHex, checkedHexes)) {
					checkedHexes.push(surroundingHex)
					visitedHexes.push(surroundingHex)
					for (const checkUnit of allUnits) {
						if (checkUnit.team !== unit.team && checkUnit.isAt(surroundingHex)) {
							enemies.push(checkUnit)
						}
					}
				}
			}
		}
		if (currentRange >= range) {
			break
		}
		checkHexes = visitedHexes
		currentRange += 1
	}
	return enemies
}