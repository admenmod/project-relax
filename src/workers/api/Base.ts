import { Event, EventDispatcher } from '@ver/events';
import { Transport } from '@/Transport';


export class Base extends EventDispatcher {
	public '@connect' = new Event<Base, Event.Args<Transport, 'attach'>>(this);
	public '@disconnect' = new Event<Base, []>(this);

	public '@request' = new Event<Base, Event.Args<Transport, 'request'>>(this);
	public '@notification' = new Event<Base, Event.Args<Transport, 'notification'>>(this);

	public '@error' = new Event<Base, [e: unknown]>(this);


	public transport!: Transport;

	protected notifications: Record<string, (...args: any[]) => any> = {};
	protected requests: Record<string, (...args: any[]) => any> = {};

	public isApi: boolean = true;

	protected handleNotification = (method: string, args: any[]): void => {
		if(this.isApi) {
			try { this.notifications[method]?.(...args); }
			catch(e) { this['@error'].emit(e); }
		} else this['@notification'].emit(method, args);
	}
	protected handleRequest = async (method: string, args: any[], response: Transport.Response): Promise<void> => {
		if(this.isApi) {
			try { response.send(await this.requests[method]?.(...args)); }
			catch(e) {
				this['@error'].emit(e);
				response.send(e, true);
			}
		} else this['@request'].emit(method, args, response);
	}

	constructor({ transport }: { transport?: Transport } = {}) {
		super();

		this.setupTransport(transport || new Transport());
	}

	// HACK: events reset
	protected setupTransport(transport: Transport): void {
		if(this.transport === transport) return;

		this.transport = transport;

		this.transport.on('request', this.handleRequest);
		this.transport.on('notification', this.handleNotification);

		this.transport.once('detach', () => {
			this['@disconnect'].emit();
			this.transport.off('request', this.handleRequest);
			this.transport.off('notification', this.handleNotification);
		});
	}

	public registerNotification(method: string, listener: (...args: any[]) => any): void {
		this.notifications[method] = listener;
	}
	public registerNotifications(listeners: Record<string, (...args: any[]) => any>, prefix: string = ''): void {
		for(const id in listeners) this.notifications[`${prefix}${id}`] = listeners[id];
	}

	public registerRequest(method: string, listener: (...args: any[]) => any): void {
		this.requests[method] = listener;
	}
	public registerRequests(listeners: Record<string, (...args: any[]) => any>, prefix: string = ''): void {
		for(const id in listeners) this.requests[`${prefix}${id}`] = listeners[id];
	}

	public notify(method: string, ...args: any[]) { return this.transport.notify(method, ...args); }
	public request<T>(method: string, ...args: any[]) { return this.transport.request<T>(method, ...args); }

	public attach(...args: Parameters<Transport['attach']>): this {
		this.transport.attach(...args);

		this['@connect'].emit(...args);

		return this;
	}
}
