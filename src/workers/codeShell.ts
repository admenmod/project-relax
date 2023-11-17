//@ts-ignore
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
//@ts-ignore
const codeShell: codeShell = function(code: string, env = Object.create(null), p = {}) {
	if(p.insulate ?? true) {
		env = new Proxy(env, {
			has: () => true,
			get: (target, key, receiver) => key === Symbol.unscopables ? void 0 : Reflect.get(target, key, receiver)
		});
	}

	return eval(`with(env) { (${p.async ? 'async ':''}function${p.generator ? '* ':''}(${p.arguments || ''}) { ${p.strict ?? true ? "'use strict'; " : ''}${code} }); } //# sourceURL=${p.source || 'code'}`);
} as codeShell

codeShell.from = code => code.toString().replace(/^function.+?\{(.*)\}$/s, '$1');
