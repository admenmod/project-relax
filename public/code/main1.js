const hash_connect = yield meta.hash;

const o = new class extends EventDispatcher {
	id = 4882827474;

	'@update:data' = new Event(this);
};

const o_connect = yield o;
o_connect.on('update', data => echo`update: ${data}`);

o.emit('update', 8283);
