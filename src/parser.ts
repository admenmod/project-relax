import { type Primotive, regexp, tag } from '@ver/helpers';


// TODO: make y pos
export const pair = (q: string, p = q, lazy = true, flags = '') => {
	if(q.length !== 1 || p.length !== 1) throw new Error('qp');

	const g = flags.includes('g');
	const y = flags.includes('y');

	let pc: number = -1;
	const arr: string[] = [];
	const indices: [number, number][] = [[-1, -1]];

	return {
		lastIndex: 0,

		exec(string: string) {
			if(y && string[this.lastIndex] !== q) return null;

			if(q === p) {
				for(let i = this.lastIndex; i < string.length; i++) {
					if(string[i] === q) {
						if(indices[0][0] === -1) {
							let c = 0;
							for(let j = i-1; j >= 0; j--) { if(string[j] === '\\') c++; else break; }
							if(c % 2) continue;

							indices[0][0] = i;
						} else {
							let c = 0;
							for(let j = i-1; j >= 0; j--) { if(string[j] === '\\') c++; else break; }
							if(c % 2) continue;

							indices[0][1] = i;
							indices[0] = [indices[0][0], indices[0][1]];
							arr[0] = string.slice(indices[0][0]+1, indices[0][1]);

							if(g) this.lastIndex = i+1;
							if(lazy) break;
						}
					}
				}
			} else {
				for(let i = this.lastIndex; i < string.length; i++) {
					if(string[i] === q) {
						indices[++pc] = [-1, -1];

						let c = 0;
						for(let j = i; j >= 0; j--) { if(string[j] === '\\') c++; else break; }
						if(c % 2) continue;

						indices[pc][0] = i;
						if(g) this.lastIndex = i+1;
					} else if(string[i] === p) {
						let c = 0;
						for(let j = i; j >= 0; j--) { if(string[j] === '\\') c++; else break; }
						if(c % 2) continue;

						indices[pc][1] = i;
						arr[pc] = string.slice(indices[pc][0]+1, indices[pc][1]);

						if(g) this.lastIndex = i+1;

						pc--;
						if(!~pc) break;
					}
				}
			}

			interface IDataPairBase extends Array<string> {
				input: string;
				indices: [number, number][];
				q: string; p: string;
				done: boolean;
			}
			interface IDataPairDone extends IDataPairBase {
				done: true;
			}
			interface IDataPairNext extends IDataPairBase {
				done: false;
				next: (next: string) => IDataPairBase | null;
			}
			type IDataPair = IDataPairDone | IDataPairNext;

			const data: IDataPair = Object.assign([], arr, {
				input: string,
				indices: indices.map<[number, number]>(([q, p]) => ([q, p])),
				q, p,
				done: indices.every(([q, p]) => ~p)
			}) satisfies IDataPairBase as any;

			if(data.done) {
				arr.length = 0;
				indices.length = 0;
			} else data.next = (next: string) => this.exec(string+next);

			return data;
		}
	};
};

export const parseString = (flags = '') => {
	const g = flags.includes('g');
	const y = flags.includes('y');

	const arr: string[] = [];
	const indices: [number, number][] = [[-1, -1]];

	return {
		lastIndex: 0,

		exec(string: string) {
			const w = ["'", '"'] ;
			let q = -1, p = -1;

			if(y && w.includes(string[this.lastIndex])) return null;

			main: for(let i = this.lastIndex; i < string.length; i++) {
				if(w.includes(string[i])) {
					if(q === -1) {
						for(let c = 0, j = i-1; j >= 0; j--) if(string[j] !== '\\' && ++c % 2) continue main;

						q = i;
					} else {
						for(let c = 0, j = i-1; j >= 0; j--) if(string[j] !== '\\' && ++c % 2) continue main;

						p = i;
						arr[0] = string.slice(indices[0][0]+1, indices[0][1]);
						arr[1] = string.slice(indices[0][0], indices[0][1]-1);

						if(g) this.lastIndex = i+1;
					}
				}
			}

			const data = Object.assign([], arr, {
				input: string,
				q, p,
				done: ~p
			});

			if(data.done) {
				arr.length = 0;
			} else throw new Error('done false');

			return data;
		}
	};
};


declare namespace Pattern {
	export type T<T extends Pattern<any>> = T extends Pattern<infer R> ? R : never;
}
type Item = Primotive | RegExp | Pattern<any> | (Primotive | RegExp | Pattern<any>)[];


class Pattern<T> implements Pattern<T> {
	public then: <A>(tratsform: (res: T, end: number) => A) => Pattern<A>;

	constructor(public exec: (str: string, pos?: number) => { res: T, end: number } | void) {
		this.then = transform => new Pattern((str, pos) => {
			const r = exec(str, pos);
			return r && { res: transform(r.res, r.end), end: r.end };
		});
	}
}


const txt = <T extends string>(text: T) => new Pattern<T>((str, pos = 0) => {
	if(!str.startsWith(text, pos)) return;
	return { res: text, end: pos + text.length };
});
const rgx = (regexp: RegExp) => new Pattern((str, pos = 0) => {
	regexp.lastIndex = 0;
	const data = regexp.exec(str.slice(pos));
	if(!data || data.index !== 0) return;

	return { res: data, end: pos + data[0].length };
});

const opt = <T>(pattern: Pattern<T>) => new Pattern<T | void>((str, pos = 0) => {
	return pattern.exec(str, pos) || { res: void 0, end: pos };
});
const exc = <T>(pattern: Pattern<T>, except: Pattern<any>) => new Pattern<T>((str, pos = 0) => {
	if(!except.exec(str, pos)) return pattern.exec(str, pos);
});
const any = <T extends Pattern<any>[]>(...patterns: T) => new Pattern<Pattern.T<T[number]>>((str, pos = 0) => {
	let r: any;
	for(const pattern of patterns) {
		if(r = pattern.exec(str, pos)) return r;
	}
});
type con<T extends Pattern<any>[]> = ({ [K in keyof T]: Pattern.T<T[K]>; });
const seq = <T extends Pattern<any>[]>(...patterns: T) => new Pattern<con<T>>((str, pos = 0) => {
	let r, res: any[] = [], end = pos;

	for(const pattern of patterns) {
		r = pattern.exec(str, end);
		if(!r) return;
		res.push(r.res);
		end = r.end;
	}

	return { res, end } as any;
});
const rep = <T extends Pattern<any>>(pattern: T, separator?: Pattern<any>) => {
	const separated: Pattern<T> = !separator ? pattern : seq(separator, pattern).then(r => r[1]);

	return new Pattern<Pattern.T<T>[]>((str, pos = 0) => {
		let res: Pattern.T<T>[] = [], end = pos, r = pattern.exec(str, end);

		while(r && r.end > end) {
			res.push(r.res);
			end = r.end;
			r = separated.exec(str, end);
		}

		return { res, end };
	});
};

const toPattern = (a: any) => {
	if(a instanceof Pattern) return a;
	if(a instanceof RegExp) return rgx(a);
	return txt(String(a));
};

const tagParseToArr = (str: TemplateStringsArray, ...args: Item[]) => {
	const arr: Pattern<any>[] = [];

	if(str[0]) arr.push(txt(str[0]));

	for(let i = 0; i < args.length; i++) {
		const arg = args[i];

		if(Array.isArray(arg)) for(const a of arg) arr.push(toPattern(a));
		else arr.push(toPattern(arg));

		if(str[i+1]) arr.push(txt(str[i+1]));
	}

	return arr;
};


type Tokens = {
	[';']: { type: ';' };

	literal_string: { type: 'literal_string', value: string };
	literal_number: { type: 'literal_number', value: number };
	literal_boolean: { type: 'literal_boolean', value: boolean };

	directoris: { type: 'directoris', value: string };

	'operation=': { type: 'operation', operator: '=', q: string, p: AnyLiteralToken };
	'operation+': { type: 'operation', operator: '+', q: AnyLiteralToken, p: AnyLiteralToken };
	'operation-': { type: 'operation', operator: '-', q: AnyLiteralToken, p: AnyLiteralToken };

	let_variable: { type: 'let_variable', keyword: 'let' | 'const', variables: string[],
		initialize: Tokens['operation='][]
	};

	codeblock: { type: 'codeblock', label: string, expressions: AnyToken[] };
};

type AnyToken = Tokens[keyof Tokens];
type LiteralTokens = ({
	[K in keyof Tokens as Tokens[K] extends { type: `literal${string}` } ? K : never]: Tokens[K];
});
type AnyLiteralToken = LiteralTokens[keyof LiteralTokens];


const tags = {
	txt: (str: TemplateStringsArray, ...args: any[]) => txt(tag.str(str, ...args)),
	rgx: (str: TemplateStringsArray, ...args: any[]) => rgx(regexp(str, ...args)('gy')),
	seq: <Args extends any[]>(str: TemplateStringsArray, ...args: Args) => seq(...tagParseToArr(str, ...args))
};

const space = opt(tags.rgx`\s+`.then(r => r[0]));
const literal_string = new Pattern<string>((str: string, pos = 0) => {
	const string = str.slice(pos);

	if(!["'", '"'].includes(string[0])) return;

	let q = -1, p = -1;
	const w = string[0];

	main: for(let i = 0; i < string.length; i++) {
		if(string[i] === w) {
			if(q === -1) {
				for(let c = 0, j = i-1; j >= 0; j--, c++) {
					if(string[j] !== '\\') {
						if(c % 2) continue main;
						else break;
					}
				}
				q = i;
			} else {
				for(let c = 0, j = i-1; j >= 0; j--, c++) {
					if(string[j] !== '\\') {
						if(c % 2) continue main;
						else break;
					}
				}
				p = i;

				return { res: string.slice(q+1, p), end: pos+p+1 };
			}
		}
	}

	return;
}).then<Tokens['literal_string']>(value => ({ type: 'literal_string', value }));
const literal_number = tags.rgx`\d+`
.then<Tokens['literal_number']>(([value]) => ({ type: 'literal_number', value: +value }));
const literal_boolean = tags.rgx`true|false`
.then<Tokens['literal_boolean']>(([value]) => ({ type: 'literal_boolean', value: value === 'true' ? true : false }));

const directoris = tags.rgx`<((?:.|\s)*?)>\n`
.then<Tokens['directoris']>(([, value]) => ({ type: 'directoris', value }));

const tchk = txt(`;`).then<Tokens[';']>(() => ({ type: ';' }));

const variableExpr = /(?:\w)(?:\w|\d)+/;
const variable = tags.rgx`${variableExpr}`.then(r => r[0]);


const evalPair: Pattern<any> = tags.rgx`\(((?:.|\s)*)\)`
	.then(([, str]) => evalAny.exec(str));

const evalAny: Pattern<AnyLiteralToken> = any(literal_string, literal_number, literal_boolean, evalPair);

const evalLet = seq(
	rgx(/(let)\s+/gy).then(r => r[1]),
	rep(seq(variable, opt(rgx(/\s*=\s*/y)), evalAny).then(([name, , value]) => ([name, value] as const))),
	tchk
).then<Tokens['let_variable']>(([keyword, list]) => {
	const token = { type: 'let_variable', keyword, variables: [], initialize: [] } as Tokens['let_variable'];

	let error = true;

	for(const [name, value] of list) {
		error = false;

		token.variables.push(name);
		if(value) token.initialize.push({ type: 'operation', operator: '=', q: name, p: value });
	}

	if(error) throw new Error('let parse');

	return token;
});

// const evalLet = tags.rgx`(let)\s+(${variableExpr})\s*(?:=\s*((?:.|\s)+))?;`
// 	.then<Tokens['let_variable']>(([, keyword, name, value]) => {
// 		const token = { type: 'let_variable', keyword, name } as Tokens['let_variable'];
//
// 		if(value) {
// 			const v = evalAny.exec(value)?.res;
// 			if(!v) throw new Error('eval value');
//
// 			token.optional = { type: 'operation', operator: '=', q: name, p: v };
// 		}
//
// 		return token;
// 	});


const blockAny = any(directoris, tchk, evalLet, evalAny);


const codeblock = tags.rgx`\s*(?:(\w+): )?\{((?:.|\s)*)\}`.then<Tokens['codeblock']>(([, label, code]) => ({
	type: 'codeblock', label,
	expressions: rep(blockAny, space)
		.exec(code, space.exec(code)!.end)!.res
}));


const parseEval = seq(opt(codeblock))
	.then(([codeblock]) => {
		if(!codeblock) throw new Error('error');

		return codeblock;
	});



((data) => {
	if(!data) return;
	console.log(data);


	let block: {
		label: string;
		scope: Record<string, any>;
	};

	const operators = {
		'=': (q: string, p: AnyLiteralToken) => block.scope[q] = p.value,
		'+': (q: AnyLiteralToken, p: AnyLiteralToken) => {
			if(q.type === 'literal_number' && p.type === 'literal_number') return q.value+p.value;
			if(q.type === 'literal_string' && p.type === 'literal_string') return q.value+p.value;

			throw new Error('operation+');
		},
		'-': (q: AnyLiteralToken, p: AnyLiteralToken) => {
			if(q.type === 'literal_number' && p.type === 'literal_number') return q.value-p.value;

			throw new Error('operation-');
		}
	};

	const directoris = (value: string) => {
		console.log(`directoris: ${value}`);
	};

	if(data.type === 'codeblock') {
		block = { label: data.label, scope: {} };

		for(const token of data.expressions) {
			switch(token.type) {
				case 'operation': {
					if(token.operator === '=') operators[token.operator](token.q, token.p);
					else operators[token.operator](token.q, token.p);
				} break;
				case 'let_variable': {
					for(const name of token.variables) block.scope[name] = void 0;
					for(const { q, p } of token.initialize) block.scope[q] = p.value;
				} break;
				case 'directoris': {
					directoris(token.value);
				} break;
			}
		}

		console.log(block);
	}
})(parseEval.exec(await fetch('/main.vs').then(data => data.text()))?.res);
