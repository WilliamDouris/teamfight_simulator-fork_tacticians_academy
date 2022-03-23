import { BonusKey, DamageType } from '@tacticians-academy/academy-library'
import type { EffectVariables } from '@tacticians-academy/academy-library'
import type { TraitKey } from '@tacticians-academy/academy-library/dist/set6/traits'

import { ChampionUnit } from '#/game/ChampionUnit'
import { needsPathfindingUpdate } from '#/game/pathfind'
import { state } from '#/game/store'

import { getClosestHexAvailableTo } from '#/helpers/boardUtils'
import { createDamageCalculation } from '#/helpers/calculate'
import { BOARD_COL_COUNT } from '#/helpers/constants'
import { StatusEffectType } from '#/helpers/types'
import type { HexCoord, StarLevel, TeamNumber } from '#/helpers/types'
import { getArrayValueCounts, randomItem } from '#/helpers/utils'

export function getBestAsMax<T>(isMaximum: boolean, entries: T[], valueFn: (entry: T) => number) {
	let bestValue = isMaximum ? 0 : Number.MAX_SAFE_INTEGER
	let bestResult: T | undefined
	entries.forEach(entry => {
		const value = valueFn(entry)
		if (isMaximum ? value > bestValue : value < bestValue) {
			bestValue = value
			bestResult = entry
		}
	})
	return bestResult
}

export function spawnUnit(fromUnit: ChampionUnit, name: string, starLevel: StarLevel) {
	const hex = fromUnit.activeHex
	const spawn = new ChampionUnit(name, getClosestHexAvailableTo(hex, state.units) ?? hex, starLevel)
	spawn.wasSpawned = true
	spawn.genericReset()
	spawn.team = fromUnit.team
	state.units.push(spawn)
	needsPathfindingUpdate()
	return spawn
}

type ItemAugmentCompatible = {name?: string, effects?: EffectVariables, variables?: EffectVariables}

export function getVariables({name, effects, variables}: ItemAugmentCompatible, ...keys: string[]) {
	if (effects === undefined) {
		effects = variables
	}
	return keys.map(key => {
		const value = effects![key]
		if (value === undefined) { console.log('ERR', name, key, effects) }
		return value ?? 0
	})
}

export const GRIEVOUS_BURN_ID = 'BURN'

export function applyGrievousBurn(itemAugment: ItemAugmentCompatible, elapsedMS: DOMHighResTimeStamp, target: ChampionUnit, source: ChampionUnit | undefined, ticksPerSecond: number) {
	if (ticksPerSecond <= 0) { ticksPerSecond = 1 }
	const variables = itemAugment.variables ?? itemAugment.effects!
	const [grievousWounds] = getVariables(itemAugment, 'GrievousWoundsPercent')
	const durationSeconds = variables['BurnDuration'] ?? variables['Duration']!
	const totalBurn = variables['BurnPercent'] ?? variables['TotalBurnPercent']!
	target.applyStatusEffect(elapsedMS, StatusEffectType.grievousWounds, durationSeconds * 1000, grievousWounds / 100)

	const existing = Array.from(target.bleeds).find(bleed => bleed.sourceID === GRIEVOUS_BURN_ID)
	const repeatsEverySeconds = 1 / ticksPerSecond
	const repeatsEveryMS = repeatsEverySeconds * 1000
	const tickCount = durationSeconds / repeatsEverySeconds
	const damage = totalBurn / tickCount / 100
	const damageCalculation = createDamageCalculation(GRIEVOUS_BURN_ID, damage, DamageType.true, BonusKey.Health, true, 1, false)
	if (existing) {
		existing.remainingIterations = tickCount
		existing.damageCalculation = damageCalculation
		existing.source = source
		existing.repeatsEveryMS = repeatsEveryMS
	} else {
		target.bleeds.add({
			sourceID: GRIEVOUS_BURN_ID,
			source,
			damageCalculation,
			activatesAtMS: elapsedMS + repeatsEveryMS,
			repeatsEveryMS,
			remainingIterations: tickCount,
		})
	}
}

export function getUnitsOfTeam(team: TeamNumber | null) {
	return state.units.filter(unit => (team == null || unit.team === team))
}

export function getAliveUnitsOfTeam(team: TeamNumber | null) {
	return state.units.filter(unit => !unit.dead && (team == null || unit.team === team))
}
export function getAliveUnitsOfTeamWithTrait(team: TeamNumber | null, trait: TraitKey) {
	return getAliveUnitsOfTeam(team).filter(unit => unit.hasTrait(trait))
}
export function getAttackableUnitsOfTeam(team: TeamNumber | null) {
	return state.units.filter(unit => (team == null || unit.team === team) && unit.isAttackable())
}
export function getInteractableUnitsOfTeam(team: TeamNumber | null) {
	return state.units.filter(unit => (team == null || unit.team === team) && unit.isInteractable())
}

export function getRowOfMostAttackable(team: TeamNumber | null) {
	const units = getAttackableUnitsOfTeam(team)
	const unitRows = units.map(unit => unit.activeHex[1])
	const unitsPerRow = getArrayValueCounts(unitRows)
	const maxUnitsInRowCount = unitsPerRow.reduce((previous, current) => Math.max(previous, current[1]), 0)
	const randomRowTarget = randomItem(unitsPerRow.filter(row => row[1] === maxUnitsInRowCount))
	const row = randomRowTarget ? parseInt(randomRowTarget[0], 10) : 0
	return [...Array(BOARD_COL_COUNT).keys()].map((col): HexCoord => [col, row])
}

export function getMostDistanceHex(closest: boolean, fromUnit: ChampionUnit, hexes: HexCoord[]) {
	return getBestAsMax(!closest, hexes, (hex) => fromUnit.hexDistanceToHex(hex))
}

export function getDistanceUnit(closest: boolean, fromUnit: ChampionUnit, team?: TeamNumber | null) {
	const units = getInteractableUnitsOfTeam(team === undefined ? fromUnit.opposingTeam() : team)
		.filter(unit => unit !== fromUnit)
	return getBestAsMax(!closest, units, (unit) => fromUnit.hexDistanceTo(unit))
}
