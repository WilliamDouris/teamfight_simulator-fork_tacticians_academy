import type { AugmentGroupKey, ChampionKey, ItemKey, TraitKey } from '@tacticians-academy/academy-library'
import type { AugmentData, BonusKey, ChampionSpellData, DamageType, ItemData, SpellCalculation, TraitData, TraitEffectData } from '@tacticians-academy/academy-library'

import type { ChampionUnit } from '#/game/ChampionUnit'
import type { AttackEffectData, GameEffect } from '#/game/effects/GameEffect'

export type HexCoord = [col: number, row: number]

export type StarLevel = 1 | 2 | 3 | 4
export type TeamNumber = 0 | 1

export interface HexRowCol {
	coord: HexCoord
}

export interface StorageChampion {
	name: string
	hex: HexCoord
	starLevel: StarLevel
	items: number[]
}

export type UnitLevelStats = [number, number?, number?]

export const enum DamageSourceType {
	attack = 'attack', spell = 'spell', bonus = 'bonus'
}

export interface DamageModifier {
	increase?: number
	multiplier?: number
	critChance?: number
}

export interface DamageResult {
	isOriginalSource: boolean
	sourceType: DamageSourceType
	damageType: DamageType | undefined
	rawDamage: number
	takingDamage: number
	didCrit: boolean
}

export interface SynergyData {
	key: TraitKey
	trait: TraitData
	activeStyle: number
	activeEffect: TraitEffectData | undefined
	uniqueUnitNames: string[]
}

export enum StatusEffectType {
	ablaze = 'ablaze',
	aoeDamageReduction = 'aoeDamageReduction',
	armorReduction = 'armorReduction',
	attackSpeedSlow = 'attackSpeedSlow',
	banished = 'banished',
	disarm = 'disarm',
	grievousWounds = 'grievousWounds',
	invulnerable = 'invulnerable',
	magicResistReduction = 'magicResistReduction',
	stealth = 'stealth',
	stunned = 'stunned',
}
export const NEGATIVE_STATUS_EFFECTS = [StatusEffectType.armorReduction, StatusEffectType.attackSpeedSlow, StatusEffectType.grievousWounds, StatusEffectType.magicResistReduction, StatusEffectType.stunned]
export const CC_STATUS_EFFECTS = [StatusEffectType.attackSpeedSlow, StatusEffectType.stunned]

export type StatusEffectData = [StatusEffectType, {
	durationMS: number
	amount?: number
}]

export interface StatusEffect {
	active: boolean
	expiresAtMS: number
	amount: number
}
export type StatusEffects = Record<StatusEffectType, StatusEffect>

export type CollisionFn = (elapsedMS: DOMHighResTimeStamp, unit: ChampionUnit, damage?: DamageResult) => void

export enum MutantType {
	AdrenalineRush = 'Adrenaline',
	BioLeeching = 'BioLeeching',
	Cybernetic = 'Cyber',
	Metamorphosis = 'Metamorphosis',
	SynapticWeb = 'Synaptic',
	Voidborne = 'Voidborne',
	VoraciousAppetite = 'Voracious',
}
export const enum MutantBonus {
	VoraciousADAP = 'ADAP',
	MetamorphosisArmorMR = 'ArmorMR',
	MetamorphosisGrowthRate = 'GrowthRate',
	BioLeechingOmnivamp = 'Omnivamp',
	VoidborneExecuteThreshold = 'ExecuteThreshold',
	AdrenalineAD = 'AD',
	SynapticManaCost = 'ManaCost',
	MetamorphosisADAP = 'ADAP',
	VoidborneTrueDamagePercent = 'TrueDamagePercent',
	CyberAD = 'AD',
	AdrenalineProcChance = 'ProcChance',
	SynapticAP = 'AP',
}

export const enum SpellKey {
	ADFromAttackSpeed = 'ADFromAttackSpeed',
	ASBoost = 'ASBoost',
	AttackSpeed = 'AttackSpeed',
	Damage = 'Damage',
	DamageReduction = 'DamageReduction',
	Duration = 'Duration',
	Heal = 'Heal',
	HealAmount = 'HealAmount',
	ManaReave = 'ManaReave',
	MaxStacks = 'MaxStacks',
	PercentHealth = 'PercentHealth',
	StunDuration = 'StunDuration',
}

export type BonusLabelKey = AugmentGroupKey | ChampionKey | TraitKey | ItemKey | SpellKey | MutantType

export type BonusVariable = [key: string, value: number | null, expiresAtMS?: DOMHighResTimeStamp]

export interface BonusScaling {
	source: ChampionUnit | undefined
	sourceID: BonusLabelKey
	activatedAtMS: DOMHighResTimeStamp
	expiresAfterMS?: DOMHighResTimeStamp
	stats: BonusKey[]
	intervalAmount?: number
	calculateAmount?: (elapsedMS: DOMHighResTimeStamp) => number
	intervalSeconds: number
}

export interface BleedData {
	sourceID: string
	source: ChampionUnit | undefined
	damageCalculation: SpellCalculation
	damageModifier?: DamageModifier
	activatesAtMS: DOMHighResTimeStamp
	repeatsEveryMS: DOMHighResTimeStamp
	remainingIterations: number
	onDeath?: CollisionFn
}

export type BonusEntry = [label: BonusLabelKey, variables: BonusVariable[]]

export interface ShieldEntry {
	id?: string
	source: ChampionUnit | undefined
	activated?: boolean
	activatesAtMS?: DOMHighResTimeStamp
	type?: 'spellShield' | 'barrier'
	amount?: number
	damageReduction?: number
	repeatAmount?: number
	expiresAtMS?: DOMHighResTimeStamp
	repeatsEveryMS?: DOMHighResTimeStamp
	bonusDamage?: SpellCalculation
	onRemoved?: (elapsedMS: DOMHighResTimeStamp, shield: ShieldEntry) => void
}

export interface ShieldData {
	id?: string
	activatesAfterMS?: DOMHighResTimeStamp
	isBarrier?: boolean
	type?: 'spellShield' | 'barrier'
	amount?: number
	damageReduction?: number
	repeatAmount?: number
	expiresAfterMS?: DOMHighResTimeStamp
	repeatsEveryMS?: DOMHighResTimeStamp
	bonusDamage?: SpellCalculation
	onRemoved?: (elapsedMS: DOMHighResTimeStamp, shield: ShieldEntry) => void
}

export type EffectResults = BonusVariable[] | void

export interface AugmentFns {
	modifyAttacks?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, unit: ChampionUnit) => AttackEffectData
	modifyDamageByHolder?: (augment: AugmentData, target: ChampionUnit, holder: ChampionUnit, damage: DamageResult) => void
	delayed?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, team: TeamNumber, units: ChampionUnit[]) => void
	teamWideTrait?: TraitKey
	startOfFight?: (augment: AugmentData, team: TeamNumber, units: ChampionUnit[]) => void
	apply?: (augment: AugmentData, team: TeamNumber, units: ChampionUnit[]) => void
	cast?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, unit: ChampionUnit) => void
	onHealShield?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, amount: number, target: ChampionUnit, source: ChampionUnit) => void
	allyDeath?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, dead: ChampionUnit, source: ChampionUnit | undefined) => void
	enemyDeath?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, dead: ChampionUnit, source: ChampionUnit | undefined) => void
	onFirstEffectTargetHit?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, target: ChampionUnit, source: ChampionUnit, damage: DamageResult) => void
	hpThreshold?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, unit: ChampionUnit) => void
	damageDealtByHolder?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, target: ChampionUnit, source: ChampionUnit, damage: DamageResult) => void
	damageTakenByHolder?: (augment: AugmentData, elapsedMS: DOMHighResTimeStamp, holder: ChampionUnit, source: ChampionUnit | undefined, damage: DamageResult) => void
}
export type AugmentEffects = {[key in string]?: AugmentFns}

export interface ChampionFns {
	cast?: (elapsedMS: DOMHighResTimeStamp, spell: ChampionSpellData, champion: ChampionUnit) => GameEffect | boolean
	passiveCasts?: boolean
	passive?: (elapsedMS: DOMHighResTimeStamp, spell: ChampionSpellData | undefined, target: ChampionUnit, source: ChampionUnit, damage: DamageResult | undefined) => void
}
export type ChampionEffects = {[key in string]?: ChampionFns}

interface ItemFns {
	adjacentHexBuff?: (item: ItemData, unit: ChampionUnit, adjacentUnits: ChampionUnit[]) => void
	apply?: (item: ItemData, unit: ChampionUnit) => void
	disableDefaultVariables?: true | BonusKey[]
	innate?: (item: ItemData, unit: ChampionUnit) => EffectResults
	update?: (elapsedMS: DOMHighResTimeStamp, item: ItemData, itemID: string, unit: ChampionUnit) => void
	damageDealtByHolder?: (item: ItemData, itemID: string, elapsedMS: DOMHighResTimeStamp, target: ChampionUnit, holder: ChampionUnit, damage: DamageResult) => void
	modifyDamageByHolder?: (item: ItemData, target: ChampionUnit, holder: ChampionUnit, damage: DamageResult) => void
	basicAttack?: (elapsedMS: DOMHighResTimeStamp, item: ItemData, itemID: string, target: ChampionUnit, holder: ChampionUnit, canReProc: boolean) => void
	damageTaken?: (elapsedMS: DOMHighResTimeStamp, item: ItemData, itemID: string, holder: ChampionUnit, source: ChampionUnit | undefined, damage: DamageResult) => void
	castWithinHexRange?: (elapsedMS: DOMHighResTimeStamp, item: ItemData, itemID: string, caster: ChampionUnit, holder: ChampionUnit) => void
	hpThreshold?: (elapsedMS: DOMHighResTimeStamp, item: ItemData, itemID: string, unit: ChampionUnit) => void
	deathOfHolder?: (elapsedMS: DOMHighResTimeStamp, item: ItemData, itemID: string, unit: ChampionUnit) => void
}
export type ItemEffects = { [key in string]?: ItemFns }

type TraitEffectFn = (unit: ChampionUnit, activeEffect: TraitEffectData) => EffectResults
interface TraitFns {
	teamEffect?: boolean | number | BonusKey[]
	disableDefaultVariables?: true | BonusKey[]
	solo?: TraitEffectFn
	team?: TraitEffectFn
	applyForOthers?: (activeEffect: TraitEffectData, unit: ChampionUnit) => void
	onceForTeam?: (activeEffect: TraitEffectData, teamNumber: TeamNumber, units: ChampionUnit[]) => void
	innate?: TraitEffectFn
	update?: (activeEffect: TraitEffectData, elapsedMS: DOMHighResTimeStamp, units: ChampionUnit[]) => EffectResults
	allyDeath?: (activeEffect: TraitEffectData, elapsedMS: DOMHighResTimeStamp, dead: ChampionUnit, traitUnits: ChampionUnit[]) => void
	enemyDeath?: (activeEffect: TraitEffectData, elapsedMS: DOMHighResTimeStamp, dead: ChampionUnit, traitUnits: ChampionUnit[]) => void
	basicAttack?: (activeEffect: TraitEffectData, target: ChampionUnit, source: ChampionUnit, canReProc: boolean) => void
	damageDealtByHolder?: (activeEffect: TraitEffectData, elapsedMS: DOMHighResTimeStamp, target: ChampionUnit, source: ChampionUnit, damage: DamageResult) => void
	modifyDamageByHolder?: (activeEffect: TraitEffectData, target: ChampionUnit, source: ChampionUnit, damage: DamageResult) => void
	hpThreshold?: (activeEffect: TraitEffectData, elapsedMS: DOMHighResTimeStamp, unit: ChampionUnit) => void
	cast?: (activeEffect: TraitEffectData, elapsedMS: DOMHighResTimeStamp, unit: ChampionUnit) => void
}
export type TraitEffects = { [key in string]?: TraitFns }
