import { BonusKey } from '@tacticians-academy/academy-library'
import type { ItemKey } from '@tacticians-academy/academy-library/dist/set6/items'

import type { ChampionUnit } from '#/game/ChampionUnit'
import type { GameEffect } from '#/game/effects/GameEffect'
import { getters, setData, state } from '#/game/store'

import { getAliveUnitsOfTeamWithTrait } from '#/helpers/abilityUtils'
import type { TeamNumber } from '#/helpers/types'
import { uniqueIdentifier } from '#/helpers/utils'

const GAME_TICK_MS = 1000 / 30

let frameID: number | null = null
let startedAtMS: DOMHighResTimeStamp = 0
let previousFrameMS: DOMHighResTimeStamp = 0

const MOVE_LOCKOUT_JUMPERS_MS = 500
const MOVE_LOCKOUT_MELEE_MS = 1000

let didBacklineJump = false
let didMeleeMove = false

const delays = new Set<[activatesAtMS: DOMHighResTimeStamp, callback: (elapsedMS: DOMHighResTimeStamp) => void]>()

export async function delayUntil(atSeconds: number) {
	return await new Promise<DOMHighResTimeStamp>((resolve, reject) => {
		delays.add([atSeconds * 1000, resolve])
	})
}

function requestNextFrame(frameMS: DOMHighResTimeStamp, unanimated?: boolean) {
	if (unanimated === true) {
		runLoop(frameMS + GAME_TICK_MS, true)
	} else {
		frameID = window.requestAnimationFrame(runLoop)
	}
}
export function runLoop(frameMS: DOMHighResTimeStamp, unanimated?: boolean) {
	if (previousFrameMS === 0) {
		previousFrameMS = frameMS
		startedAtMS = frameMS
		didBacklineJump = false
		didMeleeMove = false
		state.units.forEach(unit => {
			if (unit.jumpsToBackline()) {
				unit.jumpToBackline(0)
			}
			unit.shields.forEach(shield => {
				shield.activated = shield.activatesAtMS == null
				const healShieldBoost = shield.source?.getBonuses(BonusKey.HealShieldBoost)
				if (shield.amount && healShieldBoost != null) {
					shield.amount *= (1 + healShieldBoost)
				}
				if (shield.repeatsEveryMS != null) {
					shield.repeatAmount = shield.amount
				}
			})
		})
		const unitsByTeam: [ChampionUnit[], ChampionUnit[]] = [[], []]
		state.units.forEach(unit => unitsByTeam[unit.team].push(unit))
		unitsByTeam.forEach((units, team) => {
			getters.activeAugmentEffectsByTeam.value[team].forEach(([augment, effects]) => effects.startOfFight?.(augment, team as TeamNumber, units))
		})
		requestNextFrame(frameMS, unanimated)
		return
	}
	const diffMS = frameMS - previousFrameMS
	if (diffMS < GAME_TICK_MS - 1) {
		requestNextFrame(frameMS, unanimated)
		return
	}
	const elapsedMS = frameMS - startedAtMS

	delays.forEach(delay => {
		const [atMS, resolve] = delay
		if (elapsedMS >= atMS) {
			resolve(elapsedMS)
			delays.delete(delay)
		}
	})

	getters.synergiesByTeam.value.forEach((teamSynergies, teamNumber) => {
		teamSynergies.forEach(({ key, activeEffect }) => {
			if (activeEffect) {
				const updateFn = setData.traitEffects[key]?.update
				if (updateFn) {
					updateFn(activeEffect, elapsedMS, getAliveUnitsOfTeamWithTrait(teamNumber as TeamNumber, key))
				}
			}
		})
	})

	if (!didMeleeMove && elapsedMS >= MOVE_LOCKOUT_MELEE_MS) {
		didMeleeMove = true
	} else if (!didBacklineJump && elapsedMS >= MOVE_LOCKOUT_JUMPERS_MS) {
		didBacklineJump = true
	}
	for (const unit of state.units) {
		if (unit.dead) {
			continue
		}
		unit.updateBleeds(elapsedMS)
		unit.updateBonuses(elapsedMS)
		unit.updateRegen(elapsedMS)
		unit.updateShields(elapsedMS)
		unit.updateStatusEffects(elapsedMS)
		unit.items.forEach((item, index) => {
			setData.itemEffects[item.id as ItemKey]?.update?.(elapsedMS, item, uniqueIdentifier(index, item), unit)
		})
		for (const pendingBonus of unit.pendingBonuses) {
			const [startsAtMS, pendingKey, bonuses] = pendingBonus
			if (elapsedMS >= startsAtMS) {
				unit.addBonuses(pendingKey, ...bonuses.filter(([key, value]) => {
					if (key === BonusKey.MissingHealth) {
						if (value != null) {
							unit.gainHealth(elapsedMS, unit, unit.missingHealth() * value, true)
						}
						return false
					}
					return true
				}))
				unit.pendingBonuses.delete(pendingBonus)
			}
		}
	}

	for (const unit of state.units) {
		if (!unit.isInteractable() || unit.range() <= 0) {
			continue
		}
		unit.updateTarget()
		const unitBeganInteracting = didMeleeMove || unit.jumpsToBackline()
		if (!unitBeganInteracting) {
			continue
		}

		if (didBacklineJump && unit.canPerformAction(elapsedMS)) {
			if (unit.readyToCast()) {
				unit.castAbility(elapsedMS, true)
			} else if (unit.canAttackTarget()) {
				unit.updateAttack(elapsedMS)
			}
		}
		if (didBacklineJump || unit.jumpsToBackline()) {
			if (unit.updateMove(elapsedMS, diffMS)) {
				continue
			}
		}
	}

	([state.hexEffects, state.projectileEffects, state.shapeEffects, state.targetEffects] as Set<GameEffect>[]).forEach(effects => {
		effects.forEach(effect => {
			if (effect.update(elapsedMS, diffMS, state.units) === false) {
				effects.delete(effect)
			}
		})
	})

	previousFrameMS = frameMS
	requestNextFrame(frameMS, unanimated)
}

export function cancelLoop() {
	startedAtMS = 0
	previousFrameMS = 0
	if (frameID !== null) {
		window.cancelAnimationFrame(frameID)
		frameID = null
	}
}
