import { QueueMachine } from '@/modules/QueueMachine';


interface IOrder extends QueueMachine.IDefaultOrder {
}

export class QueueMachineCode extends QueueMachine<IOrder> {
	public parse(o: IOrder): void {
		this.push(o);
	}
}
