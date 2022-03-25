/* eslint-disable no-use-before-define */
import { ref } from 'vue'
import type { Ref } from 'vue'

import type { ChampionSpellData, ChampionSpellMissileData } from '@tacticians-academy/academy-library'

import type { ChampionUnit } from '#/game/ChampionUnit'
import { GameEffect } from '#/game/effects/GameEffect'
import type { GameEffectData } from '#/game/effects/GameEffect'
import { getCoordFrom } from '#/game/store'

import { getDistanceUnit, getInteractableUnitsOfTeam } from '#/helpers/abilityUtils'
import { DEFAULT_CAST_SECONDS, HEX_PROPORTION, HEX_PROPORTION_PER_LEAGUEUNIT, UNIT_SIZE_PROPORTION } from '#/helpers/constants'
import type { HexCoord} from '#/helpers/types'
import { coordinateDistanceSquared } from '#/helpers/boardUtils'

type TargetDeathAction = 'continue' | 'closest' | 'farthest'

export interface ProjectileEffectData extends GameEffectData {
	/** Whether the `Projectile` should complete after the first time it collides with a unit. Set to false to apply to all intermediary units collided with. */
	destroysOnCollision?: boolean
	/** The fixed number of hexes this `Projectile` should travel, regardless of its target distance. */
	fixedHexRange?: number
	/** Rotates the angle of the `Projectile`. Only works with `fixedHexRange`. */
	changeRadians?: number
	/** Only include if not passed with a `SpellCalculation`. */
	missile?: ChampionSpellMissileData
	/** Defaults to the source unit's attack target unit, or the unit's hex at cast time if `fixedHexRange` is set. */
	target?: ChampionUnit | HexCoord
	/** If the `Projectile` should retarget a new unit upon death of the original target. Only works when `target` is a ChampionUnit. */
	onTargetDeath?: TargetDeathAction
	/** Optional missile data for the `Projectile` to use if it should return to its source. */
	returnMissile?: ChampionSpellMissileData
}

function isUnit(target: ChampionUnit | HexCoord): target is ChampionUnit {
	return 'name' in target
}

export class ProjectileEffect extends GameEffect {
	coord: Ref<HexCoord>
	missile: ChampionSpellMissileData
	currentSpeed: number
	target: ChampionUnit | HexCoord
	targetCoord: HexCoord
	destroysOnCollision: boolean | undefined
	onTargetDeath: TargetDeathAction | undefined
	returnMissile: ChampionSpellMissileData | undefined
	width: number
	isReturning = false

	collisionRadiusSquared: number

	traveledDistance = 0
	maxDistance: number | undefined
	fixedDeltaX: number | undefined
	fixedDeltaY: number | undefined

	constructor(source: ChampionUnit, elapsedMS: DOMHighResTimeStamp, spell: ChampionSpellData | undefined, data: ProjectileEffectData) {
		super(source, spell, data)

		const startsAfterMS = data.startsAfterMS != null ? data.startsAfterMS : (spell ? (spell.castTime ?? DEFAULT_CAST_SECONDS) * 1000 : 0)
		const startDelay = spell?.missile?.startDelay
		this.startsAtMS = elapsedMS + startsAfterMS + (startDelay != null ? startDelay * 1000 : 0)
		this.activatesAfterMS = 0
		this.activatesAtMS = this.startsAtMS + this.activatesAfterMS
		const expiresAfterMS = 10 * 1000
		this.expiresAtMS = this.activatesAtMS + (data.expiresAfterMS != null ? data.expiresAfterMS : expiresAfterMS)

		this.coord = ref([...source.coord] as HexCoord) // Destructure to avoid mutating source
		this.missile = data.missile!
		this.currentSpeed = this.missile.speedInitial! //TODO from .travelTime
		this.target = data.target!
		this.targetCoord = [0, 0]
		this.setTarget(data.target!)
		this.destroysOnCollision = data.destroysOnCollision
		this.onTargetDeath = data.onTargetDeath
		this.returnMissile = data.returnMissile

		if (data.fixedHexRange != null) {
			const [deltaX, deltaY] = this.getDelta(this.targetCoord, data.changeRadians)
			this.fixedDeltaX = deltaX
			this.fixedDeltaY = deltaY
			this.maxDistance = data.fixedHexRange * HEX_PROPORTION
			this.targetCoord = [this.coord.value[0] + deltaX * this.maxDistance, this.coord.value[1] + deltaY * this.maxDistance]
		}

		this.width = (this.missile.width ?? 10) * 2 * HEX_PROPORTION_PER_LEAGUEUNIT
		const collisionRadius = (this.width + UNIT_SIZE_PROPORTION) / 2
		this.collisionRadiusSquared = collisionRadius * collisionRadius

		this.postInit()
	}

	getDelta(targetCoord?: HexCoord, changeRadians?: number) {
		const [currentX, currentY] = this.coord.value
		const [targetX, targetY] = targetCoord ?? this.targetCoord
		const distanceX = targetX - currentX
		const distanceY = targetY - currentY
		const angle = Math.atan2(distanceY, distanceX) + (changeRadians ?? 0)
		return [Math.cos(angle), Math.sin(angle), distanceX, distanceY]
	}

	apply = (elapsedMS: DOMHighResTimeStamp, unit: ChampionUnit) => {
		return this.applySuper(elapsedMS, unit)
	}

	checkIfDies() {
		const returnIDSuffix = 'Returns'
		if (this.returnMissile && !this.isReturning) {
			this.maxDistance = undefined
			this.setTarget(this.source)
			this.missile = this.returnMissile
			this.currentSpeed = this.missile.speedInitial!
			this.instanceID += returnIDSuffix
			this.hitID += returnIDSuffix //TODO if damage is unique to outward direction
			this.isReturning = true
			return true
		}
		return false
	}

	setTarget(target: ChampionUnit | HexCoord) {
		this.target = target
		this.targetCoord = isUnit(target) ? target.coord : getCoordFrom(target)
	}

	update = (elapsedMS: DOMHighResTimeStamp, diffMS: DOMHighResTimeStamp, units: ChampionUnit[]) => {
		const updateResult = this.updateSuper(elapsedMS, diffMS, units)
		if (updateResult != null) { return updateResult }

		if (isUnit(this.target)) {
			if (this.target.dead) {
				if (this.onTargetDeath == null) {
					return false
				}
				if (this.onTargetDeath === 'continue') {
					this.setTarget(this.target.activeHex)
				} else {
					const newTarget = getDistanceUnit(this.onTargetDeath === 'closest', this.source)
					if (newTarget) {
						this.setTarget(newTarget)
					}
				}
			} else {
				this.targetCoord = this.target.coord
			}
		}
		const diffDistance = diffMS / 1000 * this.currentSpeed * HEX_PROPORTION_PER_LEAGUEUNIT
		let angleX: number, angleY: number
		if (this.maxDistance != null) {
			if (this.traveledDistance >= this.maxDistance) {
				if (!this.isReturning && isUnit(this.target)) {
					this.apply(elapsedMS, this.target)
				}
				return this.checkIfDies()
			}
			angleX = this.fixedDeltaX!
			angleY = this.fixedDeltaY!
		} else {
			const [deltaX, deltaY, distanceX, distanceY] = this.getDelta()
			if (Math.abs(distanceX) <= diffDistance && Math.abs(distanceY) <= diffDistance) {
				if (!this.isReturning && isUnit(this.target)) {
					this.apply(elapsedMS, this.target)
				}
				return this.checkIfDies()
			}
			angleX = deltaX
			angleY = deltaY
		}
		this.traveledDistance += diffDistance

		if (this.missile.acceleration != null) {
			this.currentSpeed = this.currentSpeed + this.missile.acceleration * diffMS / 1000 //TODO determine calculation
			if (this.missile.acceleration > 0) {
				if (this.missile.speedMax != null && this.currentSpeed > this.missile.speedMax) {
					this.currentSpeed = this.missile.speedMax
				}
			} else {
				if (this.missile.speedMin != null && this.currentSpeed < this.missile.speedMin) {
					this.currentSpeed = this.missile.speedMin
				}
			}
		}
		const position = this.coord.value
		position[0] += angleX * diffDistance
		position[1] += angleY * diffDistance

		if (this.destroysOnCollision != null) {
			for (const unit of getInteractableUnitsOfTeam(this.targetTeam)) {
				if (coordinateDistanceSquared(position, unit.coord) < this.collisionRadiusSquared) {
					if (this.apply(elapsedMS, unit)) {
						if (this.destroysOnCollision) {
							return this.checkIfDies()
						}
					}
				}
			}
		}
	}
}