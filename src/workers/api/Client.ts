import { Event } from '@ver/events';
import { Base } from './Base';
import { PREFIX } from './Metadata';


export class Client extends Base {
	public '@loop' = new Event<Client, []>(this);

	public log(...args: any[]) { return this.notify('log', ...args); }
	public error(...args: any[]) { return this.notify('error', ...args); }

	public cmd<T>(cmd: string, ...args: any[]) { return this.request<T>(`${PREFIX.COMMAND}${cmd}`, ...args); }
	public command<T>(cmd: string, ...args: any[]) { return this.request<T>(`${PREFIX.COMMAND}parse`, cmd, ...args); }
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
