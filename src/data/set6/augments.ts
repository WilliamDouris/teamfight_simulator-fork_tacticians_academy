import { BonusKey } from '@tacticians-academy/academy-library'
import type { AugmentData } from '@tacticians-academy/academy-library'
import { AugmentGroupKey } from '@tacticians-academy/academy-library/dist/set6/augments'

import type { ChampionUnit } from '#/game/ChampionUnit'
import type { BonusVariable, EffectResults, TeamNumber } from '#/helpers/types'
import { getters } from '#/game/store'
import { TraitKey } from '@tacticians-academy/academy-library/dist/set6/traits'

export interface AugmentFns {
	apply?: (augment: AugmentData, team: TeamNumber, units: ChampionUnit[]) => void
	enemyDeath?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, dead: ChampionUnit, source: ChampionUnit) => void
}

export default {

	[AugmentGroupKey.SoSmall]: {
		apply: (augment, team, units) => {
			const dodgeIncrease = augment.effects['DodgeIncrease']
			if (dodgeIncrease == null) {
				return console.log('ERR', augment.name, augment.effects)
			}
			units
				.filter(unit => unit.hasTrait(TraitKey.Yordle))
				.forEach(unit => unit.addBonuses(AugmentGroupKey.SoSmall, [BonusKey.DodgeChance, dodgeIncrease]))
		},
	},

	[AugmentGroupKey.StandUnited]: {
		apply: (augment, team, units) => {
			const baseADAP = augment.effects['Resists']
			if (baseADAP == null) {
				return console.log('ERR', augment.name, augment.effects)
			}
			const bonusADAP = baseADAP * getters.synergiesByTeam.value[team].filter(({ activeEffect }) => !!activeEffect).length
			units.forEach(unit => unit.addBonuses(AugmentGroupKey.StandUnited, [BonusKey.AbilityPower, bonusADAP], [BonusKey.AttackDamage, bonusADAP]))
		},
	},

	[AugmentGroupKey.ThrillOfTheHunt]: {
		enemyDeath: (augment, elapsedMS, dead, source) => {
			const heal = augment.effects['MissingHPHeal']
			if (heal == null) {
				return console.log('ERR', augment.name, augment.effects)
			}
			source.gainHealth(elapsedMS, source, heal, true)
		},
	},

} as {[key in AugmentGroupKey]?: AugmentFns}
