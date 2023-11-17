import { Event } from '@ver/events';
import { Base } from './Base';
import { PREFIX } from './Metadata';


export class Server extends Base {
	public '@run' = new Event<Server, []>(this);
	public '@exit' = new Event<Server, [code: number]>(this);

	constructor(public worker: Worker) { super(); }

	public loop(): void { this.notify('loop'); }

	public registerCommands(listeners: Record<string, (...args: any[]) => any>) {
		return this.registerRequests(listeners, PREFIX.COMMAND);
	}

	public terminate(code: number = 0): void {
		this.worker.terminate();
		this['@exit'].emit(code);
	}
}


export const attach = (worker: Worker) => new Server(worker).attach({
	write(buffer) {
		worker.postMessage(buffer, { transfer: [buffer.buffer] });
		return true;
	}
}, {
	async *[Symbol.asyncIterator]() {
		while(true) yield await new Promise<any>((res) => worker.onmessage = e => res(e.data));
	}
});
