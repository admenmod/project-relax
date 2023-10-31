import { Vector2 } from '@ver/Vector2';
import type { Touch } from '@ver/TouchesController';
import type { Viewport } from '@ver/Viewport';
import { EventDispatcher, Event } from '@ver/events';
import { math as Math } from '@ver/helpers';
import { Input } from '@/global';


const deleteFromArray = (arr: any[], o: any) => {
	const l = arr.indexOf(o);
	if(!~l) return;
	return arr.splice(l, 1)[0];
};


type UID = string;
const generateUID = (): UID => `${Math.randomInt(0, 1e16)+1}`.padStart(16, '0');


export declare namespace Container {
	export type T<T extends Container<any>> = T extends Container<infer A> ? A : never;
}
export class Container<T extends Base = Base> extends EventDispatcher {
	public '@append' = new Event<Container<T>, [o: T]>(this);
	public '@remove' = new Event<Container<T>, [o: T]>(this);
	public '@change' = new Event<Container<T>, [o: T]>(this);

	public '@put' = new Event<Container<T>, [o: T]>(this);
	public '@pull' = new Event<Container<T>, [o: T]>(this);
	public '@transfer' = new Event<Container<T>, [o: T, container: Container<any>]>(this);


	public storage: T[] = [];

	constructor(public readonly capacity: number, public pos: Vector2) { super(); }

	public get fullness() {
		let acc = 0;
		for(let i = 0; i < this.storage.length; i++) acc += this.storage[i].bulk;
		return acc;
	}

	public hasFreeSpace(bulk: number): boolean { return this.fullness-this.capacity < bulk; }

	public get(a: T | Parameters<typeof this.storage.find>[0]): T | undefined {
		return typeof a === 'function' ? this.storage.find(a) : a;
	}
	public getAll(a: Parameters<typeof this.storage.filter>[0]): T[] {
		return this.storage.filter(a);
	}

	public append(...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		if(!this.hasFreeSpace(o.bulk)) return false;
		this.storage.push(o);

		this['@append'].emit(o);
		this['@change'].emit(o);

		return true;
	}

	public remove(...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		const stat = Boolean(deleteFromArray(this.storage, o));
		if(stat) {
			this['@remove'].emit(o);
			this['@change'].emit(o);
		}

		return stat;
	}

	public put(...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		o.pos = this.pos;

		const stat = Boolean(world.delete(o)) && this.append(o);
		if(stat) this['@put'].emit(o);

		return stat;
	}

	public pull(...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		o.pos = this.pos.buf();

		const stat = this.remove(o) && Boolean(world.create(o));
		if(stat) this['@pull'].emit(o);

		return stat;
	}

	public transfer(container: Container<any>, ...args: Parameters<typeof this.get>): boolean {
		const o = this.get(...args);
		if(!o) return false;

		const stat = this.remove(o) && container.append(o);
		if(stat) this['@transfer'].emit(o, container);

		return stat;
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
	constructor(
		pos: Vector2,
		bulk: number,
		public title: string
	) { super(pos, bulk); }
}

export class Object extends Base {
	constructor(
		pos: Vector2,
		bulk: number,
		public radius: number,
		public mass: number = radius ** 2 * Math.PI
	) { super(pos, bulk); }
}

export class Structure extends Base {
	constructor(
		pos: Vector2,
		bulk: number,
		public size: Vector2
	) { super(pos, bulk); }
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

	public '@press' = new Event<World, Event.Args<typeof Input, 'press'>>(this);
	public '@press:object' = new Event<World, [o: Object, ...Event.Args<typeof Input, 'press'>]>(this);
	public '@press:structure' = new Event<World, [o: Structure, ...Event.Args<typeof Input, 'press'>]>(this);

	public '@up' = new Event<World, Event.Args<typeof Input, 'up'>>(this);
	public '@up:object' = new Event<World, [o: Object, ...Event.Args<typeof Input, 'up'>]>(this);
	public '@up:structure' = new Event<World, [o: Structure, ...Event.Args<typeof Input, 'up'>]>(this);

	public '@move' = new Event<World, Event.Args<typeof Input, 'move'>>(this);
	public '@move:object' = new Event<World, [o: Object, ...Event.Args<typeof Input, 'move'>]>(this);
	public '@move:structure' = new Event<World, [o: Structure, ...Event.Args<typeof Input, 'move'>]>(this);

	public items: Item[] = [];
	public objects: Object[] = [];
	public structures: Structure[] = [];

	private static _instance: World;

	constructor() {
		super();

		if(World._instance) return World._instance = this;
	}

	public init(): void {
		type handler = (...args: Event.Args<World, 'press'>) => void;
		type genHandler = (type: 'press' | 'up' | 'move') => handler;
		const genHanler: genHandler = (type) => (pos, local, touch) => {
			this[`@${type}`].emit(pos, local, touch);

			for(let i = 0; i < this.structures.length; i++) {
				const o = this.structures[i];
				if(
					pos.x < o.pos.x + o.size.x/2 && pos.x > o.pos.x - o.size.x/2 &&
					pos.y < o.pos.y + o.size.y/2 && pos.y > o.pos.y - o.size.y/2
				) this[`@${type}:structure`].emit(o, pos, local, touch);
			}

			for(let i = 0; i < this.objects.length; i++) {
				const o = this.objects[i];
				if(o.pos.getDistance(pos) < o.radius) this[`@${type}:object`].emit(o, pos, local, touch);
			}
		};

		Input.on('press', genHanler('press'));
		Input.on('up', genHanler('up'));
		Input.on('move', genHanler('move'));
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
			const a = this.objects[i1];
			for(let i2 = 0; i2 < this.structures.length; i2++) {
				const b = this.structures[i2];

				const p = new Vector2(
					Math.max(b.pos.x-b.size.x/2, Math.min(a.pos.x, b.pos.x+b.size.x/2)),
					Math.max(b.pos.y-b.size.y/2, Math.min(a.pos.y, b.pos.y+b.size.y/2))
				);

				if(a.pos.getDistance(p) < a.radius) {
					if(Math.abs(b.pos.x-a.pos.x) > Math.abs(b.pos.y-a.pos.y)) {
						if(a.pos.x < b.pos.x) a.pos.x += (b.pos.x - b.size.x/2) - (a.pos.x+a.radius);
						else a.pos.x += (b.pos.x + b.size.x/2) - (a.pos.x-a.radius);
					} else {
						if(a.pos.y < b.pos.y) a.pos.y += (b.pos.y - b.size.y/2) - (a.pos.y+a.radius);
						else a.pos.y += (b.pos.y + b.size.y/2) - (a.pos.y-a.radius);
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
