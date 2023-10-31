import { Event, EventDispatcher } from '@ver/events';
import { Core, Humer } from './Eve';


const st = (str: TemplateStringsArray, ...args: (Core | Humer | PropertyKey)[]) => {
	const list = [];

	let acc = str[0];
	for(let i = 1; i < str.length; i++) {
		const a = args[i-1];

		if(a instanceof Core) acc += `${a.container.fullness}/${a.container.capacity}`;
		else if(a instanceof Humer) acc += `${a.bulk}`;
		else acc += String(a);

		acc += str[i];
	}
	return acc;
};


export interface IItem {
	title: (s: typeof st) => string;
	action: () => unknown;
}


export declare namespace Menu {
	export type Item = typeof Menu.Item;
}
export class Menu extends EventDispatcher {
	public $root = document.createElement('div');

	constructor() {
		super();

		Object.assign<CSSStyleDeclaration, Partial<CSSStyleDeclaration>>(this.$root.style, {
			padding: '10px',
			backgroundColor: '#222222',
			width: 'max-content',
			height: 'max-content',
		});
	}


	public parseList(list: IItem[]): void {
		this.$root.innerHTML = '';

		list.forEach(({ title, action }) => {
			const item = new Menu.Item(title, action);
			this.$root.append(item.$root);
		});
	}


	public static Item = class Item extends EventDispatcher {
		public $root = document.createElement('div');

		protected _title: (s: typeof st) => string;
		protected _action: () => unknown;

		public get title(): string { return this.$root.innerText; }
		public set title(title: typeof this._title) { this.$root.innerText = title(st); }

		public set action(action: typeof this._action) {
			this.$root.onclick = () => {
				action();
				this.title = this._title;
			};
		}

		constructor(title: (s: typeof st) => string, action: () => unknown) {
			super();

			this._title = title;
			this._action = action;

			this.title = title;
			this.action = action;

			Object.assign<CSSStyleDeclaration, Partial<CSSStyleDeclaration>>(this.$root.style, {
				background: '#222222',
				padding: '5px 10px',
				color: '#eeeeee',
				backgroundColor: '#111111',
				border: '1px solid #33ee77'
			});
		}
	}
}
