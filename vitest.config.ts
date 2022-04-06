/// <reference types="vitest" />
import { defineConfig } from 'vite'

import tsconfigPaths from 'vite-tsconfig-paths'
import vue from '@vitejs/plugin-vue'

export default defineConfig({ // https://vitejs.dev/config/
	plugins: [
		tsconfigPaths({ loose: true }),
		vue(),
	],
	test: {
		setupFiles: 'test/setup.ts',
		environment: 'happy-dom',
	},
})