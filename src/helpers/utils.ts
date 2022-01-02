export const TESTING = process.env.NODE_ENV !== 'production'

export function getIconURL(assetPath: string) {
	return `https://raw.communitydragon.org/latest/game/${assetPath.toLowerCase().slice(0, -3)}png`
}

export function removeFirstFromArray<T>(array: T[], findFn: (el: T) => boolean) {
	const index = array.findIndex(findFn)
	if (index > -1) {
		array.splice(index, 1)
	}
}

export function getArrayValueCounts<T extends string | number | symbol>(array: T[]): [string, number][] {
	const result: {[index in T]: number} = {} as any
	array.forEach(el => {
		if (result[el] != null) {
			result[el] += 1
		} else {
			result[el] = 1
		}
	})
	return Object.entries(result)
}

export function randomItem<T>(array: T[]) {
	const len = array.length
	return len ? array[Math.floor(Math.random() * len)] : null
}
