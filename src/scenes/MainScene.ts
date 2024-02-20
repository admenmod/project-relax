import { Vector2 } from '@ver/Vector2';
import { Animation } from '@ver/Animation';
import type { Viewport } from '@ver/Viewport';
import { MotionByTouch } from '@/modules/MotionByTouch';

import { Node2D } from '@/scenes/nodes/Node2D';
import { GridMap } from '@/scenes/gui/GridMap';
import { SystemInfo } from '@/scenes/gui/SystemInfo';
import { canvas, gm, mainLoop, touches } from '@/global';


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

		const updateOnResize = (size: Vector2) => {
			this.$gridMap.size.set(size);
		};

		updateOnResize(gm.viewport.size);

		gm.on('resize', updateOnResize);
	}

	public anims: Animation[] = [];

	protected _ready(this: MainScene): void {
		;
	}

	protected _process(this: MainScene, dt: number): void {
		this.motionByTouch.update(dt, touches, gm.viewport.position);


		gm.viewport.position.moveTime(Vector2.ZERO, 10);

		for(const i of this.anims) i.tick(dt);
	}

	protected _draw(this: MainScene, viewport: Viewport): void {
		const { ctx } = viewport;


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
