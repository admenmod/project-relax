import { Vector2 } from '@ver/Vector2';
import { loadFile } from '@/modules/os';
import { attach } from '@/workers/api/Server';
import { QueueMachineCode } from '@/modules/QueueMachineCode';
import { world } from './World';
import { IUnit } from '@/workers/api/Unit';
import { Humer } from './Eve';


export const server = attach(new Worker(new URL('../workers', import.meta.url)));
server.on('error', console.error);
server.on('exit', code => console[code ? 'error' : 'log']('exit', code));

server.worker.onerror = ({ filename, lineno, message }) => console.error(`${message}${filename}:${lineno}`);
server.worker.onmessageerror = e => console.error(e.data, e);

export const queueMachineCode = new QueueMachineCode();


server.registerNotifications({
	exit: (code: number) => server.terminate(code),
	log: console.log, error: console.error
});

server.registerCommands({
	getUnitsInfo: (): IUnit[] => world.objects.map(({ uid, position, radius, mass, bulk }) => ({ uid, position, radius, mass, bulk })),

	getInfo: (uid: string): IUnit => {
		const o = world.objects.find(o => o.uid === uid);

		if(!o) throw new Error('uid');
		if(!(o instanceof Humer)) throw new Error('type');

		return {
			uid: o.uid,
			position: o.position.buf(),
			radius: o.radius,
			mass: o.mass,
			bulk: o.bulk
		};
	},
	parse: (method: string, ...args: any[]) => {
		console.log('command: ', method, ...args);

		queueMachineCode.parse({ method, args });
	}
});

server.registerNotification('loaded', async () => {
	console.log('loading...');

	let ff = false;
	const id = setInterval(() => {
		if(ff) {
			clearInterval(id);
			server.terminate(2);
		}

		ff = true;
		server.request('ping').then(() => ff = false);
	}, 5000);

	await server.request('code', await loadFile('main.js'));

	server.emit('run');

	console.log('loaded worker');
});


const listeners = {
	moveTo: (uid: string, pos: Vector2) => {
		const o = world.objects.find(o => o.uid === uid);
		if(!o) throw new Error('uid');

		if(o instanceof Humer) {
			o.rules['move to target'] = true;
			o.movetarget.add(pos);
		}
	}
};

server.on('run', () => {
	setInterval(() => {
		queueMachineCode.move(listeners);
		server.loop();
	}, 1000);
});
