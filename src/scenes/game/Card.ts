import { Vector2 } from '@ver/Vector2';
import { math as Math } from '@ver/helpers';
import { Animation } from '@ver/Animation';
import type { Viewport } from '@ver/Viewport';

import { Sprite } from '@/scenes/nodes/Sprite';
import { Node2D } from '@/scenes/nodes/Node2D';


export class Card extends Node2D {
	public TREE() { return {
		Body: Sprite,
	}}

	public get $body() { return this.get('Body'); }


	public shooting_anim!: Animation;
	public anim!: Animation;

	public _currentFrame: number = 0;
	public get currentFrame() { return this._currentFrame; }
	public set currentFrame(v) { this._currentFrame = Math.mod(v, 0, 5); }

	protected async _init(this: Card): Promise<void> {
		await super._init();

		await this.$body.load('assets/img/unnamed.png');
		this.$body.size.set(100).inc(0.6, 1);

		const $body = this.$body;


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


		let isF = true;
		this.shooting_anim = new Animation(function* () {
			const fixPos = $body.position.buf();
			const fixRot = $body.rotation;
			yield 0;

			if(isF) yield* ccc(c => {
				$body.position.x = fixPos.x + 100 * c;
				$body.position.y = fixPos.y - 150 * c;
				$body.rotation = fixRot + Math.PI/4*3 * c;
			}, 300, 20, m);
			else yield* ccc(c => {
				c = -c;
				$body.position.x = fixPos.x + 100 * c;
				$body.position.y = fixPos.y - 150 * c;
				$body.rotation = fixRot + Math.PI/4*3 * c;
			}, 300, 20, m);

			isF = !isF;
		});


		const self = this;

		// this.anim = new Animation(function* () {
		// 	while(true) {
		// 		self.currentFrame += 1;
		// 		self.$body.size.set(10 * self.currentFrame, 100);
		// 		yield 200;
		// 	}
		// }, true, true);
		//
		// this.anim.play();
	}

	protected _process(dt: number): void {
		// this.anim.tick(dt);
		this.shooting_anim.tick(dt);
	}

	protected _draw({ ctx }: Viewport) {
		;
	}
}
