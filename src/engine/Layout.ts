import { Event, EventDispatcher } from '@ver/events';
import { codeShell } from '@ver/codeShell';
import { QueueMachine } from '@/modules/QueueMachine';


type action_type = 'onclick' | 'delay';

interface IRespons {
	action_type: action_type;
	text: string;
	name?: string;
	color?: string;
}

type Iter = Generator<IRespons, void, never>;
type Gen = () => Iter;

const color = (text: string, color: string) => {
	return `<span style="color: ${color}">${text}</span>`;
};

const text = (str: TemplateStringsArray, ...args: any[]): IRespons => {
	return {
		action_type: 'onclick',
		text: String.raw(str, ...args)
	};
};


class Person {
	constructor(
		public name: string = '',
		public color: string = ''
	) {}

	public say(str: TemplateStringsArray, ...args: any[]): IRespons {
		return {
			action_type: 'onclick',
			name: this.name,
			color: this.color,
			text: String.raw(str, ...args)
		};
	}

	public toString() { return color(this.name, this.color); }
	public [Symbol.toPrimitive]() { return color(this.name, this.color); }
}


export const env = {
	state: {} as Record<string, any>,

	Person,

	color,
	text,
	raw: String.raw,

	console
};


export const codeRen = (code: string) => codeShell<Gen>(code, env, {
	source: 'code-ren',
	generator: true
});


interface IOrder extends QueueMachine.IDefaultOrder {}

export class QueueMachineText extends QueueMachine<IOrder, boolean | void> {
	public parse({ text, name, color }: IRespons): void {
		this.push({ method: 'name', args: [name, color] });

		const cmds = text.split(/\n\n/);

		for(const cmd of cmds) {
			const m = cmd.split(/\(w\)/);

			for(let i = 0; i < m.length; i++) {
				if(i === 0) this.queue.push({ method: 'write', args: [m[i]] });
				else this.queue.push({ method: 'append', args: [m[i]] });
			}
		}

		// console.log(this.queue.map(({ method, args }) => `[${method}]: ${args}`));
	}

	public use(iter: Iter): void {
		const { value, done } = iter.next();

		if(done) return;

		this.parse(value);

		this.use(iter);
	}
}


export class Layout extends EventDispatcher {
	public root = document.createElement('div');

	constructor() {
		super();

		this.root.className = 'layout';
		this.root.hidden = true;
	}

	public use(root: HTMLElement): this {
		root.append(this.root);

		return this;
	}


	public _text: string = '';
	public get text() { return this._text; }
	public set text(v) { this._text = v; }

	public color: string = '#eeeeee';
	public name?: string;

	public setName(name: string, color: string) {
		this.name = name;
		this.color = color
	}
	public render(): void {
		this.root.innerHTML = `<fieldset class="text-fieldset">
			${this.name ? `<legend class="name-legend">${env.color(this.name, this.color)}</legend>` : ''}
			<pre>${this.text}</pre>
		</fieldset>`
	}
}
