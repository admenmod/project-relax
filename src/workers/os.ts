import { Vector2, vec2 } from '@ver/Vector2';
import { Event, EventAsFunction, EventDispatcher, Notification } from '@ver/events';
import { Path } from '@ver/Path';
import { List } from '@ver/List';
import { math as Math, NameSpace, prototype_chain, constructor_chain, delay, regexp } from '@ver/helpers';
import type { Client } from '@/workers/api/Client';


export const generateUID = () => `${Math.randomInt(0, 1e16)+1}`.padStart(16, '0');

export const generateFs = (fs = new FileSystem()) => {
	const $dev = fs.makeDir('/dev/');

	const $List = new FileSystem.File(`module.exports.List = ${List.toString()}`);
	$List.rights.native = true;
	$List.rights.rootonly_write = true;
	$dev.set('List', $List);

	const $Path = new FileSystem.File(`module.exports.Path = ${Path.toString()}`);
	$Path.rights.native = true;
	$Path.rights.rootonly_write = true;
	$dev.set('Path', $Path);

	const $Vector2 = new FileSystem.File(
`module.exports.Vector2 = ${Vector2.toString()}

module.exports.vec2 = ${vec2.toString()}`);
	$Vector2.rights.native = true;
	$Vector2.rights.rootonly_write = true;
	$dev.set('Vector2', $Vector2);

	const $events = new FileSystem.File(
`module.exports.EventAsFunction = ${EventAsFunction.toString()}

module.exports.Event = ${Event.toString()}

module.exports.Notification = ${Notification.toString()}

module.exports.EventDispatcher = ${EventDispatcher.toString()}`);
	$events.rights.native = true;
	$events.rights.rootonly_write = true;
	$dev.set('events', $events);

	const $helpers = new FileSystem.File(
`const hasOwnProperty = Object.prototype.hasOwnProperty;
const JSONcopy = data => JSON.parse(JSON.stringify(data));


const regexp = (str, ...args) => {
	for(let i = 0; i < args.length; i++) (args[i] instanceof RegExp) && (args[i] = args[i].source);
	return (flags) => RegExp(String.raw(str, ...args), flags);
};


const math = Object.create(null);

for(const id of Object.getOwnPropertyNames(Math)) math[id] = Math[id];

math.INF = Infinity;
math.TAU = math.PI*2;

math.degress = x => 180 / math.PI * x;
math.radians = x => math.PI / 180 * x;

math.randomInt = (a, b) => math.floor(math.random() * (1+b - a) + a);
math.randomFloat = (a, b) => math.random() * (b - a) + a;

math.mod = (x, min = -math.PI, max = math.PI) => {
	const range = max - min;
	const offset = ((x - min) % range + range) % range;
	return min + offset;
};

math.clamped = (min, x, max) => x < min ? min : x > max ? max : x;

Object.freeze(math);


const NameSpace = function(namespace = null) { return Object.create(namespace); }

Object.defineProperty(NameSpace, 'hasOwn', {
	enumerable: true, configurable: true,
	value: (o, k) => hasOwnProperty.call(o, k)
});

Object.defineProperty(NameSpace, 'getOwn', {
	enumerable: true, configurable: true,
	value: (o, k) => hasOwnProperty.call(o, k) ? o[k] : void 0
});

Object.defineProperty(NameSpace, Symbol.hasInstance, {
	configurable: true,
	value: (o) => !(o instanceof Object)
});

const SymbolSpace = function(symbolspace = null) {
	const space = Object.create(symbolspace);
	const s = id => space[id] || (space[id] = Symbol(id.toString()));
	s.space = space;
	return s;
}

const delay = ${delay.toString()};

const prototype_chain = ${prototype_chain.toString()}
const constructor_chain = ${constructor_chain.toString()}

module.exports = { hasOwnProperty, JSONcopy, regexp, math, NameSpace, SymbolSpace, delay, prototype_chain, constructor_chain };`);
	$helpers.rights.native = true;
	$helpers.rights.rootonly_write = true;
	$dev.set('helpers', $helpers);

	return fs;
};

export class FileSystemNativeModule {
	readFile = (src: Path) => this.#fs.readFile(src);
	writeFile = (src: Path, data: string) => this.#fs.writeFile(src, data, { root_write: false });

	readDir = (src: Path) => this.#fs.readDir(src);


	#fs: FileSystem;
	constructor(fs: FileSystem) { this.#fs = fs; }
}


export declare namespace FileSystem {
	export type File = InstanceType<typeof FileSystem.File>;
	export type Directory = InstanceType<typeof FileSystem.Directory>;
}
export class FileSystem extends EventDispatcher {
	public static File = class File {
		public readonly type = 'file';

		public size: number;
		public rights = {
			native: false,
			rootonly_write: false
		};

		constructor(public data: string) {
			this.size = data.length;
		}

		public read() { return this.data; }

		public write(data: string) {
			this.data = data;
			this.size = this.data.length;
		}
	}

	public static Directory = class Directory {
		public readonly type = 'directory';

		public tree: Record<string, FileSystem.File | FileSystem.Directory> = new NameSpace();

		public get(name: string): FileSystem.File | FileSystem.Directory | null {
			if(~name.search('/')) throw new Error('invalid name');

			return this.tree[name] || null;
		}

		public set(name: string, file: FileSystem.File): typeof file;
		public set(name: string, file: FileSystem.Directory): typeof file;
		public set(name: string, file: FileSystem.File | FileSystem.Directory): typeof file {
			if(~name.search('/')) throw new Error('invalid name');

			if(file.type === 'file') {
				this.tree[name] = file;
			} else if(file.type === 'directory') {
				this.tree[name] = file;
			} else throw new Error('invalid file');

			return file;
		}

		public del(name: string): void {
			if(~name.search('/')) throw new Error('invalid name');

			delete this.tree[name];
		}

		public read(): string[] {
			return Object.keys(this.tree);
		}
	}


	protected root: FileSystem.Directory = new FileSystem.Directory();

	public has(src: Path): boolean {
		if(!Path.isAbsolute(src)) throw new Error('path is not absolute');

		const path = Path.toArray(Path.normalize(src)).filter(Boolean);
		let t: FileSystem.Directory | FileSystem.File | null = this.root;

		for(let i = 0; i < path.length; i++) {
			if(i !== path.length-1) {
				t = t.get(path[i]);
				if(!t || t.type === 'file') return false;
			}
		}

		return true;
	}

	public get(src: Path): FileSystem.File | FileSystem.Directory {
		if(!Path.isAbsolute(src)) throw new Error('path is not absolute');

		const { filename, dir } = Path.file(Path.normalize(src));
		const path = Path.toArray(dir).filter(Boolean);
		let t: FileSystem.Directory | FileSystem.File | null = this.root;

		for(let i = 0; i < path.length; i++) {
			t = t.get(path[i]);

			if(!t || t.type === 'file') throw new Error(`invalid path (${src})`);
		}

		if(t!.type !== 'directory') throw new Error(`invalid path (${src})`);
		return t!.get(filename)!;
	}

	public readDir(src: Path): string[] {
		if(!Path.isAbsolute(src)) throw new Error('path is not absolute');

		const path = Path.toArray(Path.normalize(src)).filter(Boolean);
		let t: FileSystem.Directory | FileSystem.File | null = this.root;

		for(let i = 0; i < path.length; i++) {
			t = t.get(path[i]);

			if(!t || t.type === 'file') throw new Error(`invalid path (${src})`);
		}

		if(t!.type !== 'directory') throw new Error('this is not directory');

		return (t as FileSystem.Directory).read();
	}

	public makeDir(src: Path) {
		if(!Path.isAbsolute(src)) throw new Error('path is not absolute');

		const { filename, dir } = Path.file(Path.normalize(src));
		const path = Path.toArray(dir).filter(Boolean);
		let t: FileSystem.Directory | FileSystem.File | null = this.root;

		for(let i = 0; i < path.length; i++) {
			t = t.get(path[i]);

			if(!t || t.type === 'file') throw new Error(`invalid path (${src})`);
		}

		if(!(t as FileSystem.Directory).get(filename)) {
			return (t as FileSystem.Directory).set(filename, new FileSystem.Directory());
		} throw new Error('this is not file');
	}

	public readFile(src: Path): string {
		if(!Path.isAbsolute(src)) throw new Error('path is not absolute');

		const { filename, dir } = Path.file(Path.normalize(src));
		const path = Path.toArray(dir).filter(Boolean);
		let t: FileSystem.Directory | FileSystem.File | null = this.root;

		for(let i = 0; i < path.length; i++) {
			t = t.get(path[i]);

			if(!t || t.type === 'file') throw new Error(`invalid path (${src})`);
		}

		const file = (t as FileSystem.Directory).get(filename);
		if(!file || file!.type !== 'file') throw new Error('this is not file');

		return file.read();
	}

	public writeFile(src: Path, data: string, rights = {
		root_write: false
	}): void {
		if(!Path.isAbsolute(src)) throw new Error('path is not absolute');

		const { filename, dir } = Path.file(Path.normalize(src));
		const path = Path.toArray(dir).filter(Boolean);
		let t: FileSystem.Directory | FileSystem.File | null = this.root;

		for(let i = 0; i < path.length; i++) {
			t = t.get(path[i]);

			if(!t || t.type === 'file') throw new Error(`invalid path (${src})`);
		}

		const file = (t as FileSystem.Directory).get(filename) || (t as FileSystem.Directory).set(filename, new FileSystem.File(data));
		if(file!.type !== 'file') throw new Error('this is not file');

		if(file.rights.rootonly_write && !rights.root_write) throw new Error('not have permission to write this file');

		return file.write(data);
	}

	public getRightsFile(src: Path) {
		const file = this.get(src);
		if(file.type !== 'file') throw new Error('this is not fils');

		return file.rights;
	}
}


export const Process = async (
	_env: Record<PropertyKey, any>,
	os_env: Record<string, string>,
	fs: FileSystem,
	path: Path,
	exit: (code: number) => void
) => {
	const uid: string = generateUID();
	let cwd: Path = Path.file(path).dir;
	let cache: Record<string, any> = {};
	let module: any;

	const meta_env = Object.assign(new NameSpace(os_env), {
		PWD: cwd
	});

	class Std {
		#buffer: string[] = [];

		public onread: ((data: string) => unknown) | null = null;
		public onwrite: ((data: string) => unknown) | null = null;

		public read() {
			const data = this.#buffer.shift();
			if(data) this.onread?.(data);
			return data;
		}
		public write(data: string) {
			this.#buffer.unshift(data);
			this.onwrite?.(data);
		}
	}

		public async *[Symbol.asyncIterator]() { while(true) yield await this.read(); }
	} */

	const Stream = () => {
		const buffer: string[] = [];
		const onwrite = EventAsFunction<null, [data: string]>(null);

		return Object.assign(async function(data: string) {
			buffer.unshift(data);
			onwrite(data);
		}, {
			isEnding: true,

			async next() { return new Promise<string>((res, rej) => {
				const data = buffer.shift();
				if(this.isEnding && !data) return;

				if(data) res(data);
				else onwrite.once(res);
			}); },

			async *[Symbol.asyncIterator]() {
				while(true) yield await this.next();
			}
		});
	};

	const stdin = Stream();
	const stdout = Stream();
	const stderr = Stream();

	const env = Object.assign(new NameSpace(_env), {
		get stdin() { return stdin.next(); },
		set stdout(data: string) { stdout(data); },
		set stderr(data: string) { stderr(data); },

		exit
	});

	const execute = async (code: string, path: Path, isNative: boolean = false) => {
		const { dir: __dirname, filename } = Path.file(path);
		const __filename = Path.relative(filename, __dirname);

		const require = Object.freeze(Object.assign(async (src: string) => {
			if(Path.isDefault(src)) src = `/dev/${src}`;

			let module = null;
			const path = Path.relative(src, __dirname);

			if(path in cache) return cache[path];

			const code = fs.readFile(path);
			const rights = fs.getRightsFile(path);

			if(code) module = await execute(code, path, rights.native);
			if(!module) return;

			return cache[path] = module;
		}, { cache, url: __filename }));

		const meta = Object.freeze(Object.assign(new NameSpace(), {
			uid,
			url: __filename,
			env: os_env,
			resolve: (src: Path) => Path.relative(src, __dirname),
			import: require
		}));

		const exports = new NameSpace();
		const module = Object.freeze({
			path: __dirname,
			filename: __filename,
			require,
			get exports() { return exports; },
			set exports(v) { Object.assign(exports, v); }
		});

		const api = null;

		await codeShell<(
			this: typeof api,
			__dirname_: typeof __dirname,
			__filename_: typeof __filename,
			meta_: typeof meta,
			module_: typeof module,
			require_: typeof require,
		) => Promise<void | number>>(code, env, {
			async: true,
			insulate: !isNative,
			source: path.toString(),
			arguments: '__dirname, __filename, meta, module, require'
		}).call(api, __dirname, __filename, meta, module, require);

		return module.exports || module;
	};

	module = await execute(fs.readFile(path), path);

	return { uid, cwd, cache, env, module, stdin, stdout, stderr };
}


export const OS = (client: Client, main_code: string) => {
	const main_path = '/main';

	const exit = (code: number) => client.notify('exit', code);

	const fs = generateFs(new FileSystem());
	fs.writeFile(main_path, main_code);

	const os_env = Object.freeze(Object.assign(new NameSpace(), {
		PWD: '/'
	}));

	const env = Object.assign(new NameSpace(), {
		Object, String, Number, Symbol, Error,

		fs: new FileSystemNativeModule(fs),

		console: {
			log: (...args: any[]) => void client.log(...args),
				error: (...args: any[]) => void client.error(...args)
		}
	});
	env.globalThis = env.global = env;

	const run = async () => {
		try {
			return await Process(env, os_env, fs, main_path, exit);
		} catch(e: any) {
			const reg = regexp`at eval \((${main_path}:\d+:\d+)\)`();
			if(e && e.stack) e.stack = e.stack.replace(reg, 'at $1').split('\n').slice(0, -4).join('\n');
			throw e;
		}
	};

	return { fs, run, exit };
};
