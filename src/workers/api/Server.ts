import { Event } from '@ver/events';
import { Base } from './Base';
import { PREFIX } from './Metadata';
import type { IData } from './Client';
import { Vector2 } from '@ver/Vector2';


export class Server extends Base {
	public '@exit' = new Event<Server, [code: number]>(this);

	constructor(public worker: Worker) { super(); }

	public loop(data: IData) { return this.request<number>('loop', data); }

	public registerCommands(listeners: Record<string, (...args: any[]) => any>) {
		return this.registerRequests(listeners, PREFIX.COMMAND);
	}

	public registerState<IState, IData = IState>({ id, initialState, encode, decode }: {
		id: string;
		initialState: IState;
		encode: (state: IState) => IData;
		decode: (data: IData, state: IState) => IState | null | void;
	}) {
		let state: IState = initialState;

		this['@notification'].on((method, [stateId, data]) => {
			if(method !== 'syncState' || stateId !== id) return;

			state = decode(data, state) ?? state;
		}, -10);

		return { id, get: () => state, sync: () => this.notify(`syncState`, id, encode(state)) };
	}

	public terminate(code: number = 0): void {
		this['@exit'].emit(code);
		this.worker.terminate();
	}
}


export const attach = (worker: Worker) => new Server(worker).attach({
	async write(buffer) {
		worker.postMessage(buffer, { transfer: [buffer.buffer] });
	}
}, {
	async *[Symbol.asyncIterator]() {
		while(true) yield await new Promise<any>((res) => worker.onmessage = e => res(e.data));
	}
});
