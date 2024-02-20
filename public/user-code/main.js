/*
 INFO: args, env, return, yield
 HACK: input - args (local), (get?) env (global), yield (step)
 HACK: outputs - return (main), yield (step), args.out (fn local), (set? - acc) env.out (fn global)
 HACK: async-await

args: {
	__dirname, __filename,
	meta: { import, url, env, resolve },
	module: { exports, path, filename, require },
	require: src => module & { cache: url }
	exit(code)
}

api - this

env - global - globalThis: {
	fs,
	console
}
*/


const { Event } = await meta.import('events');


console.log('main start');

console.log(Object.getOwnPropertyNames(global));

net.on('notification', (method, args) => console.log([method, ...args]));
net.on('request', (method, args, responce) => console.log([method, ...args, String(responce)]));

net.request('adsa', 'arg1', 'arg2', 'arg3', 'arg4');

console.log('main end');
