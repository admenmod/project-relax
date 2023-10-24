import { Vector2 } from '@ver/Vector2';
import type { Viewport } from '@ver/Viewport';
import { EventDispatcher, Event } from '@ver/events';
import { math as Math } from '@ver/helpers';


const deleteFromArray = (arr: any[], o: any) => {
	const l = arr.indexOf(o);
	if(!~l) return;
	return arr.splice(l, 1)[0];
};


type UID = string;
const generateUID = (): UID => `${Math.randomInt(0, 1e16)+1}`;


export class Container<T extends Base = Base> {
	public storage: T[] = [];

	constructor(public readonly capacity: number, public pos: Vector2) {}

	public get fullness() {
		let acc = 0;
		for(let i = 0; i < this.storage.length; i++) acc += this.storage[i].bulk;
		return acc;
	}

	public hasFreeSpace(bulk: number): boolean { return this.fullness-this.capacity < bulk; }

	public get(a: T | Parameters<typeof this.storage.find>[0]): T | undefined {
		return typeof a === 'function' ? this.storage.find(a) : a;
	}

	public append(...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		if(!this.hasFreeSpace(o.bulk)) return false;
		this.storage.push(o);

		return true;
	}

	public remove(...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		return Boolean(deleteFromArray(this.storage, o));
	}

	public put(...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		o.pos = this.pos;

		return Boolean(world.delete(o)) && this.append(o);
	}

	public pull(...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		o.pos = this.pos.buf();

		return this.remove(o) && Boolean(world.create(o));
	}

	public transfer(container: Container, ...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		return this.remove(o) && container.append(o);
	}
}


export class Base extends EventDispatcher {
	public readonly uid: UID = generateUID();

	constructor(
		public pos: Vector2,
		public bulk: number
	) { super(); }
}

export class Item extends Base {
	public static readonly TYPE = 'Item';
}

export class Object extends Base {
	public speed = 1;
	public mass = 1;
	public target = new Vector2();

	constructor(
		pos: Vector2,
		bulk: number,
		public radius: number
	) {
		super(pos, bulk);

		this.mass = this.radius ** 2 * Math.PI;
	}


	public static readonly TYPE = 'Object';
}

export class Structure extends Base {
	constructor(
		pos: Vector2,
		bulk: number,
		public size: Vector2
	) { super(pos, bulk); }


	public static readonly TYPE = 'Structure';
}

export class World extends EventDispatcher {
	public '@created' = new Event<World, [o: Base]>(this);
	public '@created:item' = new Event<World, [o: Item]>(this);
	public '@created:object' = new Event<World, [o: Object]>(this);
	public '@created:structure' = new Event<World, [o: Structure]>(this);

	public '@deleted' = new Event<World, [o: Base]>(this);
	public '@deleted:item' = new Event<World, [o: Item]>(this);
	public '@deleted:object' = new Event<World, [o: Object]>(this);
	public '@deleted:structure' = new Event<World, [o: Structure]>(this);

	public items: Item[] = [];
	public objects: Object[] = [];
	public structures: Structure[] = [];

	private static _instance: World;

	constructor() {
		super();

		if(World._instance) World._instance = this;
	}

	public create<T extends Base>(this: World, o: T): T {
		if(o instanceof Item) {
			this.items.push(o);
			this.emit('created:item', o);
		} else if(o instanceof Object) {
			this.objects.push(o);
			this.emit('created:object', o);
		} else if(o instanceof Structure) {
			this.structures.push(o);
			this.emit('created:structure', o);
		} else throw new Error('invalid type');

		this.emit('created', o);

		return o;
	}

	public delete<T extends Base>(this: World, o: T): T | undefined {
		let a: Base;
		if(o instanceof Item) {
			a = deleteFromArray(this.items, o);
			this.emit('deleted:item', o);
		} else if(o instanceof Object) {
			a = deleteFromArray(this.objects, o);
			this.emit('deleted:object', o);
		} else if(o instanceof Structure) {
			a = deleteFromArray(this.structures, o);
			this.emit('deleted:structure', o);
		} else throw new Error('invalid type');

		this.emit('deleted', a);

		return a as T;
	}

	public process(dt: number): void {
		// object - object
		for(let i1 = 0; i1 < this.objects.length-1; i1++) {
			let a = this.objects[i1];
			for(let i2 = i1+1; i2 < this.objects.length; i2++) {
				let b = this.objects[i2];

				let diff = a.pos.getDistance(b.pos) - (a.radius + b.radius);
				if(diff < 0) {
					diff = Math.abs(diff);
					if(a.mass > b.mass) [a, b] = [b, a];
					const c = b.mass/a.mass;
					a.pos.moveAngle(diff - diff/c, b.pos.getAngleRelative(a.pos));
					b.pos.moveAngle(diff/c, a.pos.getAngleRelative(b.pos));
				}
			}
		}
		// object - structure
		for(let i1 = 0; i1 < this.objects.length; i1++) {
			let a = this.objects[i1];
			for(let i2 = i1; i2 < this.structures.length; i2++) {
				let box = this.structures[i2];

				const b = new Vector2(
					Math.max(box.pos.x-box.size.x/2, Math.min(a.pos.x, box.pos.x+box.size.x/2)),
					Math.max(box.pos.y-box.size.y/2, Math.min(a.pos.y, box.pos.y+box.size.y/2))
				);

				const diff = a.pos.getDistance(b) - a.radius;
				if(diff < 0) {
					if(Math.abs(b.x-a.pos.x) > Math.abs(b.y-a.pos.y)) {
						if(a.pos.x < b.x) a.pos.x += b.x - (a.pos.x+a.radius);
						else a.pos.x += b.x - (a.pos.x-a.radius);
					} else {
						if(a.pos.y < b.y) a.pos.y += b.y - (a.pos.y+a.radius);
						else a.pos.y += b.y - (a.pos.y-a.radius);
					}
				}
			}
		}
	}

	public draw({ ctx }: Viewport): void {
		const DEBAG_UID = false;
		const ALPHA = 0.2;
		const COLOR = '#eeee11';
		const WIDTH = 1;

		ctx.lineWidth = WIDTH;

		ctx.font = '10px Arial';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		for(let i = 0; i < this.structures.length; i++) {
			const { uid, pos, size, constructor } = this.structures[i];

			ctx.beginPath();

			ctx.globalAlpha = 1;
			ctx.fillStyle = '#2222ee';
			ctx.fillRect(pos.x-size.x/2, pos.y-size.y/2, size.x, size.y);

			ctx.globalAlpha = ALPHA;
			ctx.strokeStyle = COLOR;
			ctx.strokeRect(pos.x-size.x/2, pos.y-size.y/2, size.x, size.y);
			ctx.globalAlpha = 1;

			if(DEBAG_UID) {
				ctx.strokeStyle = '#111111';
				ctx.strokeText(`${constructor.name}: ${uid}`, pos.x, pos.y);
				ctx.fillStyle = '#eeeeee';
				ctx.fillText(`${constructor.name}: ${uid}`, pos.x, pos.y);
			}
		}

		for(let i = 0; i < this.objects.length; i++) {
			const { uid, pos, radius, constructor } = this.objects[i];

			ctx.beginPath();
			ctx.arc(pos.x, pos.y, radius, 0, Math.TAU);
			ctx.closePath();

			ctx.globalAlpha = 1;
			ctx.strokeStyle = COLOR;
			ctx.stroke();

			ctx.globalAlpha = ALPHA;
			ctx.fillStyle = '#22ee22';
			ctx.fill();
			ctx.globalAlpha = 1;

			if(DEBAG_UID) {
				ctx.strokeStyle = '#111111';
				ctx.strokeText(`${constructor.name}: ${uid}`, pos.x, pos.y);
				ctx.fillStyle = '#eeeeee';
				ctx.fillText(`${constructor.name}: ${uid}`, pos.x, pos.y);
			}
		}

		for(let i = 0; i < this.items.length; i++) {
			const { uid, pos, constructor } = this.items[i];

			ctx.beginPath();
			ctx.arc(pos.x, pos.y, 2, 0, Math.TAU);
			ctx.closePath();

			ctx.globalAlpha = 1;
			ctx.strokeStyle = COLOR;
			ctx.stroke();

			ctx.fillStyle = '#ee2222';
			ctx.fill();
			ctx.globalAlpha = 1;

			if(DEBAG_UID) {
				ctx.strokeStyle = '#111111';
				ctx.strokeText(`${constructor.name}: ${uid}`, pos.x, pos.y);
				ctx.fillStyle = '#eeeeee';
				ctx.fillText(`${constructor.name}: ${uid}`, pos.x, pos.y);
			}
		}
	}
}


export const world = new World();
