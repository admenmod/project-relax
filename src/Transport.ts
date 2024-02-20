import { Event, EventDispatcher } from '@ver/events';
import { decode, decodeMultiStream, encode, ExtensionCodec } from '@msgpack/msgpack';
import { Vector2 } from '@ver/Vector2';


export const TYPE_ENUM = {
	REQUEST: 0,
	RESPONSE: 1,
	NOTIFICATION: 2
} as const;

export type TYPE_ENUM = typeof TYPE_ENUM[keyof typeof TYPE_ENUM];

export type PendingHandler = (error: any, result: any) => any;


export interface Writable<T = any> { write(buffer: T): Promise<void>; }
export interface Readable<T = any> extends AsyncIterable<ArrayLike<T>> {}


class Response {
	private sent: boolean = false;

	constructor(
		private extensionCodec: ExtensionCodec,
		private encoder: Writable<ArrayBufferView>,
		private requestId: number
	) {}

	public send(res: any, isError: boolean = false): void {
		if(this.sent) throw new Error(`Response to id ${this.requestId} already sent`);

		const encoded = encode([
			TYPE_ENUM.RESPONSE,
			this.requestId,
			isError ? res : null,
			!isError ? res : null
		], { extensionCodec: this.extensionCodec });

		this.encoder.write(encoded);
		this.sent = true;
	}
}


export declare namespace Transport {
	export type Response = InstanceType<typeof Response>;
}
export class Transport extends EventDispatcher {
	public writer!: Writable<ArrayBufferView>;
	public reader!: Readable<number>;

	public '@attach' = new Event<Transport, [Writable<ArrayBufferView>, Readable<number>]>(this);
	public '@detach' = new Event<Transport, []>(this);

	public '@request' = new Event<Transport, [method: string, args: any[], response: Response]>(this);
	public '@notification' = new Event<Transport, [method: string, args: any[]]>(this);

	protected nextRequestId: number = 0;
	protected pending: Map<number, PendingHandler> = new Map();


	protected readonly extensionCodec: ExtensionCodec = this.initializeExtensionCodec();

	protected initializeExtensionCodec(): ExtensionCodec {
		const codec = new ExtensionCodec();

		codec.register({
			type: 0,
			encode: input => input instanceof Error ? encode({ message: input.message, stack: input.stack }) : null,	
			decode: data => {
				const err = decode(data) as any;
				const e = new Error(err.message);
				e.stack = err.stack;
				return e;
			}
		});

		codec.register({
			type: 1,
			encode: input => input instanceof Vector2 ? encode([input.x, input.y]) : null,	
			decode: data => new Vector2().set(decode(data) as [number, number])
		});

		return codec;
	}

	protected encodeToBuffer(value: unknown): Uint8Array {
		return encode(value, { extensionCodec: this.extensionCodec });
	}

	protected on_result(data: any[]): void {
		const msg_type = data[0];

		if(msg_type === TYPE_ENUM.REQUEST) {
			this['@request'].emit(data[2], data[3], new Response(this.extensionCodec, this.writer, data[1]));
		} else if(msg_type === TYPE_ENUM.RESPONSE) {
			const id = data[1];
			const handler = this.pending.get(id)!;
			this.pending.delete(id);
			handler(data[2], data[3]);
		} else if(msg_type === TYPE_ENUM.NOTIFICATION) {
			this['@notification'].emit(data[1], data[2]);
		} else throw 'error msg_type';
	}

	public requestSync(method: string, args: any[], cb: PendingHandler): void {
		this.nextRequestId += 1;
		let v = this.encodeToBuffer([TYPE_ENUM.REQUEST, this.nextRequestId, method, args]);
		this.writer.write(v);
		this.pending.set(this.nextRequestId, cb);
	}

	public request<T = unknown>(method: string, ...args: any[]): Promise<T> {
		return new Promise<T>((res, rej) => {
			this.requestSync(method, args, (error, result) => error ? rej(error) : res(result));
		});
	}

	public notify(method: string, ...args: any[]): void {
		this.writer.write(this.encodeToBuffer([TYPE_ENUM.NOTIFICATION, method, args]));
	}

	public attach(writer: Writable<ArrayBufferView>, reader: Readable<number>): this {
		this.writer = writer;
		this.reader = reader;

		(async () => {
			const asyncDecodeGenerator = decodeMultiStream(this.reader, {
				extensionCodec: this.extensionCodec
			});

			for await(const data of asyncDecodeGenerator) this.on_result(data as any[]);
			this['@detach'].emit();
		})();


		this['@attach'].emit(this.writer, this.reader);

		return this;
	}
}
