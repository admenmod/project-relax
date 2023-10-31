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

import { Layout, Server, codeRen } from '@/engine/Layout';


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


		const server = new Server();
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
			if(!server.queue.length) {
				layout.root.hidden = true;
				layout.root.onclick = null;
				mainLoop.start();
			}

			while(server.move(listener)) {}
		};

		const execScript = async (filename: string) => {
			const text = await fetch(`/text/${filename}.js`).then(data => data.text());
			const ren = codeRen(text);

			server.use(ren());

			mainLoop.stop();

			serverHander();

			layout.root.hidden = false;

			setTimeout(() => layout.root.onclick = serverHander, 500);
		};


		world.once('press:structure', s => {
			if(!server.queue.length) execScript('help-core-structure');
		});


		const generateAnimation = (h: Humer): Animation.Generator => function*() {
			yield 0;

			h.pos.x += yield 10;
		};
	}

	public anims: Animation[] = [];

	public $: Record<string, any> = {};

	protected _ready(this: MainScene): void {
		const core = world.create(new Core(vec2(0, 0)));
		const core2 = world.create(new Core(vec2(200, 0)));

		const humer = core.build(Humer);
		const humer2 = core2.build(Humer);


		const menu = new Menu();
		canvas.append(menu.$root);


		this.$.core = core;
		this.$.humer = humer;


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

	protected _process(this: MainScene, dt: number): void {
		this.motionByTouch.update(dt, touches, gm.viewport.position);


		gm.viewport.position.moveTime(Vector2.ZERO, 10);

		for(const i of this.anims) i.tick(dt);

		for(const o of world.objects) o instanceof Humer && o.pos.moveTo(o.movetarget, o.speed * dt);

		world.process(dt);
	}

	protected _draw(this: MainScene, viewport: Viewport): void {
		const { ctx } = viewport;

		world.draw(viewport);


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
