import { Unit } from './Unit';
import { Client } from './Client';


export class Game {
	#cli: Client;

	constructor(client: Client) { this.#cli = client; }

	public getUnitsInfo(): Promise<Unit[]> {
		return this.#cli.cmd<IUnit[]>('getUnitsInfo').then(list => list.map(data => new Unit(this.#cli, data)));
	}
}
