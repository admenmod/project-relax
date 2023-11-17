export class Logger {
	constructor(
		public name: string,
		public console: {
			log: (...args: any[]) => void;
			error: (...args: any[]) => void;
		}
	) {}
}


