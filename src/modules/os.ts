import { Vector2, vec2 } from '@ver/Vector2';
import { Event, EventAsFunction, EventDispatcher, Notification } from '@ver/events';
import { Path } from '@ver/Path';
import { List } from '@ver/List';
import { math as Math, JSONcopy, NameSpace, SymbolSpace, prototype_chain, constructor_chain } from '@ver/helpers';


export const generateUID = () => `${Math.randomInt(0, 1e16)+1}`.padStart(16, '0');

export const loadFile = (src: string) => fetch(`${location.origin}/user-code/${src}`).then(data => data.text());

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
	$dev.set('path', $Vector2);

	const $events = new FileSystem.File(
`module.exports.EventAsFunction = ${EventAsFunction.toString()}
module.exports.Event = ${Event.toString()}
module.exports.Notification = ${Notification.toString()}
module.exports.EventDispatcher = ${EventDispatcher.toString()}`);
	$events.rights.native = true;
	$events.rights.rootonly_write = true;
	$dev.set('events', $events);

	return fs;
};

export class FileSystemNativeModule {
	readFile = (src: Path) => this.#fs.readFile(src);
	writeFile = (src: Path, data: string) => this.#fs.writeFile(src, data, { root_write: false });

	readDir = (src: Path) => this.#fs.readDir(src);


	#fs: FileSystem;
	constructor(fs: FileSystem) { this.#fs = fs; }
}


export const Process = async (codeShell: codeShell, env = new NameSpace(), fs: FileSystem = new FileSystem(), path = '/main.js') => {
	let uid: string = generateUID();
	let cwd: Path = Path.file(path).dir;
	let cache: Record<string, any> = {};
	let module: any;

	const execute = async (code: string, path: Path, isNative: boolean = false) => {
		const { dir: __dirname, filename } = Path.file(path);
		const __filename = Path.relative(filename, __dirname);

		const require = async (src: string) => {
			if(Path.isDefault(src)) src = `/dev/${src}`;

			let module = null;
			const path = Path.relative(src, __dirname);

			if(path in cache) return cache[path];

			const code = fs.readFile(path);
			const rights = fs.getRightsFile(path);

			if(code) module = await execute(code, path, rights.native);
			if(!module) return;

			return cache[path] = module;
		};
		require.cache = cache;

		const module = {
			path: __dirname,
			filename: __filename,
			exports: {},
			require
		};

		await codeShell<(
			__dirname: string, __filename: string,
			module: { filename: string, exports: {} }, require: (src: string) => Promise<any>
		) => Promise<void>>(code, env, {
			arguments: '__dirname, __filename, module, require',
			async: true,
			insulate: !isNative,
			source: path.toString()
		}).call(null, __dirname, __filename, module, require);

		return module.exports || module;
	};

	module = await execute(fs.readFile(path), path);

	return { uid, cwd, cache, env, module };
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
