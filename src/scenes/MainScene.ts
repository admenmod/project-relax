import { Vector2, vec2 } from '@ver/Vector2';
import { Animation } from '@ver/Animation';
import type { Viewport } from '@ver/Viewport';
import { MotionByTouch } from '@/modules/MotionByTouch';

import { Node2D } from '@/scenes/nodes/Node2D';
import { GridMap } from '@/scenes/gui/GridMap';
import { SystemInfo } from '@/scenes/gui/SystemInfo';
import { canvas, gm, mainLoop, touches } from '@/global';

import { world } from '@/modules/World';
import { Core, Humer } from '@/modules/Eve';
import { Menu } from '@/modules/HTMLMenuItemElement';

import { Layout, QueueMachineText, codeRen } from '@/engine/Layout';

import '@/modules/ServerCodeShell';


export class MainScene extends Node2D {
	private motionByTouch = new MotionByTouch();


	public TREE() { return {
		GridMap,
		SystemInfo
	}}

	protected static async _load(scene: typeof this): Promise<void> {
		await Promise.all([
			super._load(scene)
		]);
	}


	// aliases
	public get $gridMap() { return this.get('GridMap'); }

	protected async _init(this: MainScene): Promise<void> {
		await super._init();


		gm.viewport.position.set(200, 200);

		world.init();

		const updateOnResize = (size: Vector2) => {
			this.$gridMap.size.set(size);
		};

		updateOnResize(gm.viewport.size);

		gm.on('resize', updateOnResize);


		const lserver = new QueueMachineText();
		const layout = new Layout().use(canvas);

		const listener = {
			name(name: string, color: string) {
				layout.setName(name, color);
				return true;
			},
			write(text: string) {
				layout.text = text;
				layout.render();
			},
			append(text: string) {
				layout.text += text;
				layout.render();
			}
		};

		const serverHander = () => {
			if(!lserver.queue.length) {
				layout.root.hidden = true;
				layout.root.onclick = null;
				mainLoop.start();
			}

			while(lserver.move(listener)) {}
		};

		const execScript = async (filename: string) => {
			const text = await fetch(`/text/${filename}.js`).then(data => data.text());

			lserver.use(codeRen(text)());

			mainLoop.stop();

			serverHander();

			layout.root.hidden = false;

			setTimeout(() => layout.root.onclick = serverHander, 500);
		};


		world.once('press:structure', s => {
			if(!lserver.queue.length) execScript('help-core-structure');
		});

		world.once('collision:o-o', (a, b) => {
			if(!lserver.queue.length) execScript('help-object-collision');

			this.anims.push(new Animation(generateAnimation(b as Humer)));
			this.anims.forEach(i => i.play(true));
		});


		function* ccc(cb: (c: number) => any, time: number, step: number, m: (c: number) => number): Generator<number, void, number> {
			let t = 0;

			cb(0);
			while(t < time) {
				cb(m(t / time));
				t += yield step;
			}
			cb(1);
		}

		const m = (c: number) => c ** 1;

		const generateAnimation = (h: Humer): Animation.Generator => function*() {
			let isF = true;
			const fr = h.radius;
			const d = 2;

			yield 0;

			while(true) {
				if(isF) yield* ccc(c => {
					h.radius = fr + d * c;
				}, 300, 20, m);
				else yield* ccc(c => {
					h.radius = (fr + d) - d*c;
				}, 300, 20, m);

				isF = !isF;
			}
		};



		const core = world.create(new Core(vec2(0, 0)));
		const core2 = world.create(new Core(vec2(200, 0)));

		const humer = core.buildUnit(Humer);
		const humer2 = core2.buildUnit(Humer);


		const menu = new Menu();
		canvas.append(menu.$root);


		world.on('press:structure', core => {
			if(core instanceof Core) {
				menu.parseList([{
					title: s => s`pull (${core})`,
					action: () => core.container.pull(o => o instanceof Humer)
				}]);
			}
		});


		world.on('move', world.on('press', pos => {
			humer.movetarget.set(pos);
		}));
	}

	public anims: Animation[] = [];

	protected _ready(this: MainScene): void {
		;
	}

	protected _process(this: MainScene, dt: number): void {
		this.motionByTouch.update(dt, touches, gm.viewport.position);


		gm.viewport.position.moveTime(Vector2.ZERO, 10);

		for(const i of this.anims) i.tick(dt);

		world.process(dt);
	}

	protected _draw(this: MainScene, viewport: Viewport): void {
		const { ctx } = viewport;

		world.render(viewport);


		const center = Vector2.ZERO;

		const a = 30;

		ctx.beginPath();
		ctx.strokeStyle = '#ffff00';
		ctx.moveTo(center.x, center.y-a);
		ctx.lineTo(center.x, center.y+a);
		ctx.moveTo(center.x-a, center.y);
		ctx.lineTo(center.x+a, center.y);
		ctx.stroke();
	}
}
