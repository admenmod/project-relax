import { Vector2 } from '@ver/Vector2';
import type { Viewport } from '@ver/Viewport';

import { PhysicsBox2DItem } from '@/scenes/PhysicsBox2DItem';
import { Sprite } from '@/scenes/nodes/Sprite';
import { b2Shapes, b2Vec2 } from '@/modules/Box2DWrapper';
import type { Joystick } from '@/scenes/gui/Joystick';


export class Car extends PhysicsBox2DItem {
	public size = new Vector2(30, 70);


	public TREE() { return {
		Sprite
	}}

	public get $sprite() { return this.get('Sprite'); }


	protected async _init(this: Car): Promise<void> {
		await super._init();

		await this.$sprite.load('assets/img/car.png');
		this.$sprite.offset_angle = -Math.PI/2;
		this.$sprite.size.div(4);
		this.size.set(this.$sprite.size);


		this.b2bodyDef.type = 2;
		this.b2bodyDef.allowSleep = false;

		this.b2fixtureDef.density = 2;

		const shape = new b2Shapes.b2PolygonShape();
		shape.SetAsBox(this.size.y/this.pixelDensity/2, this.size.x/this.pixelDensity/2);


		this.on('PhysicsBox2D:init', () => {
			const b2DataMass = new b2Shapes.b2MassData();
			b2DataMass.I = 6;
			b2DataMass.center.Set(0, 1);

			this.b2body!.SetMassData(b2DataMass);
		});

		this.b2fixtureDef.shape = shape;
	}

	protected _process(dt: number): void {
		this.b2_angularVelocity *= 0.95;
		this.b2_velosity.Multiply(0.95);
	}


	public control(joystick: Joystick, joystickR: Joystick): void {
		let value = joystick.value;
		let angle = joystick.angle;

		if(joystick.touch) {
			const dir = Math.abs(angle) < Math.PI/2 ? 1 : -1;
			const dira = Math.sign(angle);

			const v = value * dir * (dir > 0 ? 0.001 : 0.0003);
			const a = (Math.abs(angle) < Math.PI/2 ? Math.abs(angle) : -Math.PI/2 / Math.abs(angle)) / 10000 * dira;

			this.b2_angularVelocity += a * this.b2_velosity.Length() * 70;
			this.b2_velosity.x += v * Math.cos(this.b2_angle - Math.PI/2);
			this.b2_velosity.y += v * Math.sin(this.b2_angle - Math.PI/2);
		}
	}
}
