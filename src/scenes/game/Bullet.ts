import { Event } from '@ver/events';
import { Vector2 } from '@ver/Vector2';
import type { Viewport } from '@ver/Viewport';

import { Node2D } from '@/scenes/nodes/Node2D';
import { PhysicsBox2DItem } from '@/scenes/PhysicsBox2DItem';
import { b2Shapes, b2Vec2 } from '@/modules/Box2DWrapper';
import { physicsBox2DSystem } from '@/global';


export class Bullet extends PhysicsBox2DItem {
	public size = new Vector2(2, 2);

	protected async _init(): Promise<void> {
		await super._init();

		this.b2bodyDef.type = 2;
		this.b2bodyDef.bullet = true;
		this.b2bodyDef.allowSleep = false;
		this.b2bodyDef.fixedRotation = true;

		const shape = new b2Shapes.b2CircleShape();
		shape.SetRadius(this.size.y/this.pixelDensity/2);

		this.b2fixtureDef.shape = shape;
	}


	protected _process(dt: number): void {
		this.b2_velosity.Multiply(0.995);
		this.b2_angularVelocity *= 0.97;
	}


	protected _draw({ ctx }: Viewport) {
		ctx.beginPath();
		ctx.fillStyle = '#ee1111';
		ctx.arc(0, 0, this.size.x, 0, Math.PI*2);
		ctx.fill();
	}
}


export class BulletContainer extends Node2D {
	public maxItems: number = 10;
	public items: Bullet[] = [];


	protected static async _load(scene: typeof this): Promise<void> {
		await super._load(scene);

		await Bullet.load();
	}


	public createItem(pos: Vector2, angle: number, value: number, size: number): void {
		let item: Bullet;
		let isNewItem = false;

		if(this.items.length >= this.maxItems) {
			item = this.items.splice(0, 1)[0];
			this.items.push(item);
			isNewItem = false;
		} else {
			item = new Bullet();
			isNewItem = true;
		}

		if(!isNewItem) {
			item.b2body!.SetPosition(new b2Vec2(pos.x, pos.y));

			item.b2_velosity.x = value * Math.cos(angle);
			item.b2_velosity.y = value * Math.sin(angle);
		} else {
			item.size.set(size);

			item.init().then(() => {
				physicsBox2DSystem.add(item);

				item.b2body!.SetPosition(new b2Vec2(pos.x, pos.y));

				item.b2_velosity.x = value * Math.cos(angle);
				item.b2_velosity.y = value * Math.sin(angle);
			});
		}

		this.items.push(item);
	}


	protected _process(dt: number): void {
		for(let i = 0, len = this.items.length; i < len; i++) {
			this.items[i].process(dt);
			const l = this.items.findIndex(i => i.alpha <= 0);

			if(~l) {
				this.items.splice(l, 1);
				i--;
				len--;
			}
		}
	}

	protected _render(viewport: Viewport): void {
		super._render(viewport);
		for(let i = 0; i < this.items.length; i++) this.items[i].render(viewport);
	}
}
