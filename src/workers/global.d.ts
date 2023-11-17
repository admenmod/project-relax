declare const importScripts: (src: string) => void;


interface codeShell {
	<T extends (this: any, ...args: any[]) => any = () => void>(code: string, env?: object, p?: {
		strict?: boolean;
		async?: boolean;
		generator?: boolean;
		arguments?: string;
		insulate?: boolean;
		source?: string;
	}): T;

	from: (code: (...args: any[]) => any) => string;
}

declare const codeShell: codeShell;
