import { Event, EventDispatcher } from '@ver/events';


export declare namespace QueueMachine {
	export interface IDefaultOrder {
		method: string;
		args: any[];
	}
}
export class QueueMachine<
	IOrder extends QueueMachine.IDefaultOrder = QueueMachine.IDefaultOrder,
	R = void
> extends EventDispatcher {
	public '@move' = new Event<QueueMachine<IOrder, R>, [IOrder, R]>(this);

	public queue: IOrder[] = [];
	public push(o: IOrder): void { this.queue.push(o); }

	public move(listener: Record<string, (...args: any[]) => R>): R | void {
		const q = this.queue.shift();
		if(!q) return;

		const res = listener[q.method]?.(...q.args);

		this['@move'].emit(q, res);

		return res;
	}
}
