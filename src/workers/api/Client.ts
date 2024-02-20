import { Event } from '@ver/events';
import { Base } from './Base';
import { PREFIX } from './Metadata';
import { Unit } from './Unit';


export interface IData {
	units: Unit[];
}


export class Client extends Base {
	public '@loop' = new Event<Client, []>(this);

	public data: IData = {
		units: []
	};

	public log(...args: any[]) { return this.notify('log', ...args); }
	public error(...args: any[]) { return this.notify('error', ...args); }

	public cmd<T>(cmd: string, ...args: any[]) { return this.request<T>(`${PREFIX.COMMAND}${cmd}`, ...args); }
	public command<T>(cmd: string, ...args: any[]) { return this.request<T>(`${PREFIX.COMMAND}parse`, cmd, ...args); }


	public registerState<IState, IData = IState>({ id, initialState, encode, decode }: {
		id: string;
		initialState: any;
		encode: (state: IState) => IData;
		decode: (data: IData) => IState;
	}) {
		let state: IState = initialState;
		const get = () => state;
		const sync = () => this.notify(`syncState`, id, encode(state));

		this['@notification'].on((method, [stateId, data]) => {
			if(method !== 'syncState' || stateId !== id) return;

			state = decode(data);
		}, -10);

		return { id, get, sync };
	}
}


export const attach = () => new Client().attach({
	write(buffer) {
		self.postMessage(buffer, { transfer: [buffer.buffer] });
		return true;
	}
}, {
	async *[Symbol.asyncIterator]() {
		while(true) yield await new Promise<any>((res) => self.onmessage = e => res(e.data));
	}
});
