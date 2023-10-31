import { Event, EventDispatcher } from '@ver/events';


export class Value extends EventDispatcher {
	public '@change' = new Event<Value, [value: string, prev: string]>(this);

	protected _dependencies: Value[] = [];
	protected _value: string = '';

	constructor(value: string = '') {
		super();

		this._value = value;
	}

	public get() { return this._value; }
	public set(str: TemplateStringsArray, ...values: any[]): string {
		const dep = [];
		const prev = this._value;

		for(const v of values) {
			if(v === this || !(v instanceof Value) || this._dependencies.includes(v)) continue;

			const fn = v.on('change', () => {
				if(!this._dependencies.includes(v)) v.off('change', fn);
				else this._set(str, ...values);
			});

			dep.push(v);
		}

		this._dependencies.length = 0;
		this._dependencies.push(...dep);

		const value = this._set(str, ...values);
		this['@change'].emit(value, prev);

		return value;
	}

	protected _set(str: TemplateStringsArray, ...args: any[]): string {
		let acc = str[0];

		for(let i = 1; i < str.length; i++) {
			const a = args[i-1];

			if(a instanceof Value) acc += a._value;
			else acc += String(a);

			acc += str[i];
		}

		this._value = acc;

		return acc;
	}

	public toString() { return this._value; }
	public [Symbol.toPrimitive]() { return this._value; }
}


// const tag = new Value('div');
// const cont = new Value('hello');
// const html = new Value();
//
// html.set`<${tag}>${cont}</${tag}>`;
//
// tag.set`nav`;
//
// html.set`<>${html}</>`;
// html.set`start${cont}end`;
