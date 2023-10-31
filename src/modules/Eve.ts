import { Vector2 } from '@ver/Vector2';
import { Container, Item, Object, Structure } from './World';


export class Core extends Structure {
	public container = new Container<Item | Object>(10000, this.pos);

	constructor(pos: Vector2) {
		super(pos, 120*120, new Vector2(120, 120));
	}

	public build<T extends new (pos: Vector2) => Container.T<typeof this.container>>(C: T): InstanceType<T> {
		const o = new C(this.pos.buf());

		if(!this.container.append(o)) throw new Error('not free space');

		return o as InstanceType<T>;
	}
}


export class Humer extends Object {
	public container = new Container<Item>(1000, this.pos);

	public speed = 0.1;
	public movetarget = new Vector2();

	constructor(pos: Vector2) {
		super(pos, 1000, 10);

		this.movetarget.set(this.pos);
	}
}
