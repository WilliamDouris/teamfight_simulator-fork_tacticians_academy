import type { ChampionSpellData, SpellCalculation } from '@tacticians-academy/academy-library'

import type { ChampionUnit } from '#/game/ChampionUnit'

import type { CollisionFn, DamageSourceType, HexCoord, TeamNumber } from '#/helpers/types'

const DEFAULT_CAST_TIME = 0.25 // TODO confirm default cast time
const DEFAULT_TRAVEL_TIME = 0 // TODO confirm default travel time

export interface HexEffectData {
	expiresAfterMS?: DOMHighResTimeStamp
	hexes: HexCoord[]
	targetTeam?: TeamNumber
	damageCalculation?: SpellCalculation
	damageMultiplier?: number,
	damageIncrease?: number,
	damageSourceType?: DamageSourceType
	stunSeconds?: number
	onCollision?: CollisionFn
}

let instanceIndex = 0

export class HexEffect {
	instanceID: string

	startsAtMS: DOMHighResTimeStamp
	activatesAfterMS: DOMHighResTimeStamp
	activatesAtMS: DOMHighResTimeStamp
	expiresAtMS: DOMHighResTimeStamp
	source: ChampionUnit
	targetTeam: TeamNumber | null
	hexes: HexCoord[]
	damageCalculation?: SpellCalculation
	damageMultiplier?: number
	damageIncrease?: number
	damageSourceType?: DamageSourceType
	stunMS: number | null
	onCollision?: CollisionFn

	activated = false

	constructor(source: ChampionUnit, elapsedMS: DOMHighResTimeStamp, spell: ChampionSpellData, data: HexEffectData) {
		this.instanceID = `h${instanceIndex += 1}`
		this.startsAtMS = elapsedMS + (spell.castTime ?? DEFAULT_CAST_TIME) * 1000
		this.activatesAfterMS = (spell.missile!.travelTime ?? DEFAULT_TRAVEL_TIME) * 1000
		this.activatesAtMS = this.startsAtMS + this.activatesAfterMS
		this.expiresAtMS = this.activatesAtMS + (data.expiresAfterMS == null ? 0 : data.expiresAfterMS)
		this.source = source
		this.targetTeam = data.targetTeam === undefined ? source.opposingTeam() : data.targetTeam
		this.hexes = data.hexes
		this.damageCalculation = data.damageCalculation
		this.damageMultiplier = data.damageMultiplier
		this.damageIncrease = data.damageIncrease
		this.damageSourceType = data.damageSourceType
		this.stunMS = data.stunSeconds != null ? data.stunSeconds * 1000 : null
		this.onCollision = data.onCollision
	}

	apply(elapsedMS: DOMHighResTimeStamp, unit: ChampionUnit) {
		const spellShield = unit.consumeSpellShield()
		if (this.damageCalculation != null) {
			let damageIncrease = this.damageIncrease ?? 0
			if (spellShield) {
				damageIncrease -= spellShield.amount
			}
			unit.damage(elapsedMS, true, this.source, this.damageSourceType!, this.damageCalculation!, true, damageIncrease === 0 ? undefined : damageIncrease, this.damageMultiplier)
		}
		if (spellShield == null) {
			if (this.stunMS != null) {
				unit.stunnedUntilMS = Math.max(unit.stunnedUntilMS, elapsedMS + this.stunMS)
			}
			this.onCollision?.(elapsedMS, unit)
		}
	}

	update(elapsedMS: DOMHighResTimeStamp, units: ChampionUnit[]) {
		if (this.activated && elapsedMS > this.expiresAtMS) {
			return false
		}
		if (elapsedMS < this.activatesAtMS) {
			return true
		}
		this.activated = true
		const targetingUnits = this.targetTeam == null ? units : units.filter(unit => unit.team === this.targetTeam)
		for (const unit of targetingUnits.filter(unit => unit.isInteractable() && unit.isIn(this.hexes))) {
			this.apply(elapsedMS, unit)
		}
		return true
	}
}
