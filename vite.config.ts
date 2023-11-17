import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';


const prefix = `src/workers`;

export default defineConfig({
	plugins: [tsconfigPaths()],
	// build: {
	// 	rollupOptions: {
	// 		output: {
	// 			manualChunks: {
	// 				codeWorker: [`${prefix}/index`]
	// 			}
	// 		}
	// 	}
	// },
	// worker: {
	// 	rollupOptions: {
	// 		output: {
	// 			preserveModules: true
	// 		}
	// 	}
	// }

	// optimizeDeps: {
	// 	include: ['workers']
	// },
	// build: {
	// 	rollupOptions: {
	// 		output: {
	// 			preserveModules: true,
	// 			paths: {
	// 				'@ver/*': 'src/ver/*',
	// 				'@/*': 'src/*'
	// 			}
	// 		}
	// 	}
	// }
});
