<script setup lang="ts">
import DisplayTrait from '#/ui/components/Sidebar/DisplayTrait.vue'
import SelectPlayersAugments from '#/ui/components/Sidebar/SelectPlayersAugments.vue'

import { useStore, clearBoardStateAndReset } from '#/store/store'

import { MutantType } from '#/sim/helpers/types'

import { getTeamName } from '#/ui/helpers/utils'

const { getters: { synergiesByTeam }, state } = useStore()

function onReset() {
	const confirmed = window.confirm('Clear all units from board?')
	if (confirmed) {
		clearBoardStateAndReset()
	}
}
</script>

<template>
<div class="p-1">
	<form @submit.prevent>
		<fieldset :disabled="state.didStart">
			<div>
				<label for="select-stage" class="mr-1">Stage:</label>
				<select id="select-stage" v-model="state.stageNumber">
					<option v-for="stageNumber in 9" :key="stageNumber">{{ stageNumber }}</option>
				</select>
			</div>
			<div v-if="Math.floor(state.setNumber) === 6">
				<label for="select-mutant" class="mr-1">Mutants:</label>
				<select id="select-mutant" v-model="state.mutantType" class="w-full">
					<option v-for="type in MutantType" :key="type">{{ type }}</option>
				</select>
			</div>
			<SelectPlayersAugments v-if="state.setNumber >= 6" />
			<div v-if="!state.didStart && state.units.length">
				<button class="block ml-auto mt-1 mb-2 px-3 h-8 bg-quaternary rounded-full" @click="onReset">Reset board...</button>
			</div>
		</fieldset>
	</form>
	<template v-if="state.units.length">
		<div v-for="(teamSynergies, teamIndex) in synergiesByTeam" :key="teamIndex">
			<div class="font-semibold">Team {{ getTeamName(teamIndex) }}</div>
			<div v-for="{ key, trait, activeStyle, activeEffect, uniqueUnitNames } in teamSynergies" :key="key">
				<DisplayTrait v-if="activeStyle > 0" :trait="trait" :activeStyle="activeStyle" :activeEffect="activeEffect" :units="uniqueUnitNames" />
			</div>
			<div class="text-secondary text-sm">
				<template v-for="{ key, trait, activeStyle } in teamSynergies" :key="key">
					<span v-if="activeStyle === 0">{{ trait.name }}, </span>
				</template>
			</div>
		</div>
	</template>
</div>
</template>
