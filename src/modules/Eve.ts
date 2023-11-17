import { Vector2 } from '@ver/Vector2';
import { Container, Item, Object, Structure, World, world } from './World';


export class PC {
	public shell!: () => void;

	public api = {
		rules: {} as Record<string, boolean>,
		process: (dt: string) => {}
	};

	public env = {
		setRule: (id: string, value: boolean) => (id in this.api.rules) && (this.api.rules[id] = Boolean(value)),

		console
	};

	constructor(public source: string, public code: Promise<string>) {
		// code.then(code => this.shell = codeShell<typeof this.shell>(code, this.env, {
		// 	async: true,
		// 	source: this.source
		// })).then(shell => shell());
	}

	public process(dt: number): void {

	}
}


export class Core extends Structure {
	public container = new Container<Item | Object>(10000, this.position);

	constructor(pos: Vector2) {
		super(pos, 120*120, new Vector2(120, 120));
	}

	public buildUnit<T extends new (pos: Vector2) => Unit>(C: T): InstanceType<T> {
		const o = new C(this.position.buf());

		if(!this.container.append(o)) throw new Error('not free space');

		return o as InstanceType<T>;
	}
}


export class Unit extends Object {
	public pc: PC;

	public container = new Container<Item>(1000, this.position);

	public speed = 0.1;
	public movetarget = new Vector2();

	constructor(
		pos: Vector2, bulk: number, radius: number,
		public rules: Record<string, boolean> = {}
	) {
		super(pos, bulk, radius);

		this.pc = new PC(
			`${this.constructor.name}: ${this.uid}`,
			fetch(`/user-code/${this.constructor.name}.js`).then(data => data.text())
		);

		this.pc.api.rules = this.rules;

		this.movetarget.set(this.position);
	}
}


export class Humer extends Unit {
	constructor(pos: Vector2) {
		super(pos, 1000, 10, {
			'move to target': false
		});
	}

	public process(dt: number): void {
		if(this.rules['move to target']) this.position.moveTo(this.movetarget, this.speed * dt);
	}
}
