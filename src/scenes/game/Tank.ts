import { Vector2 } from '@ver/Vector2';
import { Event } from '@ver/events';
import type { Viewport } from '@ver/Viewport';

import { PhysicsBox2DItem } from '@/scenes/PhysicsBox2DItem';
import { Sprite } from '@/scenes/nodes/Sprite';
import { b2Shapes, b2Vec2 } from '@/modules/Box2DWrapper';
import type { Joystick } from '@/scenes/gui/Joystick';
import { roundLoop } from '@ver/helpers';


export class Tank extends PhysicsBox2DItem {
	public '@shoot' = new Event<Tank, [o: Tank]>(this);


	public size = new Vector2(70, 140);


	public TREE() { return {
		Body: Sprite,
		Head: Sprite
	}}

	public get $body() { return this.get('Body'); }
	public get $head() { return this.get('Head'); }


	private offsetHead = new Vector2(0, -25);

	protected async _init(this: Tank): Promise<void> {
		await super._init();

		const scaleSprite = 2;

		await this.$body.load('assets/free-2d-battle-tank-game-assets/Hull_06.png');
		this.$body.size.div(scaleSprite);
		this.size.set(this.$body.size);
		this.size.x = this.size.x / 6*4;

		await this.$head.load('assets/free-2d-battle-tank-game-assets/Gun_03.png');
		this.$head.size.div(scaleSprite);
		this.$head.offset.set(this.offsetHead);
		this.$head.position.set(0, 15);


		this.b2bodyDef.type = 2;
		this.b2bodyDef.allowSleep = false;

		this.b2fixtureDef.density = 2;

		const shape = new b2Shapes.b2PolygonShape();
		shape.SetAsBox(this.size.x/this.pixelDensity/2, this.size.y/this.pixelDensity/2);

		this.b2fixtureDef.shape = shape;
	}

	protected _process(dt: number): void {
		if(this.timer_shoot > 0) this.timer_shoot -= dt;

		this.b2_angularVelocity *= 0.93;
		this.b2_velosity.Multiply(0.93);
	}


	private timer_shoot: number = 0;

	public control(joystickL: Joystick, joystickR: Joystick): void {
		if(joystickL.touch) {
			const value = joystickL.value;
			const angle = joystickL.angle;

			const dir = Math.abs(angle) < Math.PI/2 ? 1 : -1;
			const dira = Math.sign(angle);

			const a = (Math.abs(angle) < Math.PI/2 ? Math.abs(angle) : -Math.PI/2 / Math.abs(angle)) * 0.000015 * dira;
			let v = value * dir * (dir > 0 ? 0.0003 : 0.0001);
			v *= (Math.abs(roundLoop(Math.abs(angle) - Math.PI/2)) < Math.PI/10 ? 0 : 1);

			this.b2_angularVelocity += a;
			this.b2_velosity.x += v * Math.cos(this.b2_angle - Math.PI/2);
			this.b2_velosity.y += v * Math.sin(this.b2_angle - Math.PI/2);
		}

		if(joystickR.touch) {
			const value = joystickR.value;
			const angle = joystickR.angle;

			if(Math.abs(angle - this.$head.rotation) < 0.01) this.$head.rotation = angle;
			else {
				const targetRot = new Vector2(1, 0).rotate(angle);
				const thisRot = new Vector2(1, 0).rotate(this.$head.rotation);

				this.$head.rotation += Math.sign(thisRot.cross(targetRot)) * 0.01;
			}


			if(value === 1 && this.timer_shoot <= 0) {
				this.$head.offset.set(0, -20);

				const ha = this.$head.rotation;
				this.b2_velosity.x -= Math.cos(ha - Math.PI/2) * 0.0001;
				this.b2_velosity.y -= Math.sin(ha - Math.PI/2) * 0.0001;

				this['@shoot'].emit(this);

				this.timer_shoot = 5000;
			} else this.$head.offset.moveTime(this.offsetHead, 10);
		}
	}
}
