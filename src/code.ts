import { Event, EventDispatcher } from '@ver/events';
import { codeShell } from '@ver/codeShell';
import { delay, tag } from '@ver/helpers';


const [code0, code1] = await Promise.all([
	fetch('/code/main0.js').then(data => data.text()),
	fetch('/code/main1.js').then(data => data.text())
]);

// const codesplit = code.split(/^\/\/# (.*)$/gm).filter(Boolean);


const execute = (hash: string, code: string, args: any, env: any, api: any) => {
	return codeShell<(this: typeof api, ...args: any[]) => AsyncGenerator<any, any, any>>(code, env, {
		arguments: Object.keys(args).join(', '),
		async: true,
		generator: true,
		source: hash
	}).apply(api, Object.values(args));
};

const base = (hash: string) => {
	const self: any = {
		echo: (str: TemplateStringsArray, ...args: any[]) => console.log(`[${hash}]: `, tag.str(str, ...args)),
		Event, EventDispatcher, Object, String, Boolean, Number
	};
	self.self = self;

	return self;
};

const pc0 = await (async (hash, code) => {
	const args = {
		meta: { hash }
	};
	const env = { ...base(hash) };
	const api = null;

	return await execute(hash, code, args, env, api);
})('main0', code0);

const pc1 = await (async (hash, code) => {
	const args = {
		meta: { hash }
	};
	const env = { ...base(hash) };
	const api = null;

	return await execute(hash, code, args, env, api);
})('main1', code1);

(async () => {
	let pc = [pc0, pc1];
	const Y = [void 0, void 0];

	let i = 0;

	while(true) {
		console.group(`[${i}]`);

		const [{
			value: value0, done: done0
		}, {
			value: value1, done: done1
		}] = await Promise.all([pc[0].next(Y[1]), pc[1].next(Y[0])]);

		if(done0 && done1) break;

		console.log('[values]: ', value0, value1);

		Y[0] = value0;
		Y[1] = value1;

		await delay(() => void 0, 300);
		i++;
		console.groupEnd();
	}
})();
