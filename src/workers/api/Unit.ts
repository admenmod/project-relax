import { Vector2 } from '@ver/Vector2';
import { Client } from './Client';


export interface IUnit {
	uid: string;
	position: Vector2;
	radius: number;
	mass: number;
	bulk: number;
}

export class Unit implements IUnit {
	#cli: Client;

	public uid!: string;
	public position = new Vector2();
	public radius!: number;
	public mass!: number;
	public bulk!: number;

	constructor(client: Client, data: IUnit) {
		this.#cli = client;
		this.data = data;
	}

	public get data(): IUnit {
		return {
			uid: this.uid,
			position: this.position.buf(),
			radius: this.radius,
			mass: this.mass,
			bulk: this.bulk
		};
	}
	public set data(data: IUnit) {
		this.uid = data.uid;
		this.position.set(data.position);
		this.radius = data.radius;
		this.mass = data.mass;
		this.bulk = data.bulk;
	}

	public getInfo() { return this.#cli.cmd<IUnit>('getInfo', this.uid); }
	public moveTo(pos: Vector2) { return this.#cli.command<void>('moveTo', this.uid, pos); }
}
