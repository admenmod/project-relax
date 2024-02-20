import { Vector2 } from '@ver/Vector2';
import { NameSpace } from '@ver/helpers';
import { attach } from './api/Client';
import { Logger } from '@/modules/Logger';
import { Process, FileSystem, generateFs, FileSystemNativeModule } from '@/modules/os';
import { Game } from './api/Game';


const logger = new Logger('worker', {
	log: (...args) => void client.log(...args),
	error: (...args) => void client.error(...args)
});

const { console } = logger;


const client = attach();
client.on('error', console.error);

client.registerNotifications({
	loop: (data: typeof client.data) => (client.data = data) && mainModule?.loop()
});

client.registerRequests({
	ping: () => 'pong',

	code: async (code: string) => {
		const logger = new Logger('code', {
			log: (...args) => void client.log(...args),
			error: (...args) => void client.error(...args)
		});

		const fs = generateFs(new FileSystem());
		fs.writeFile('/main.js', code);

		const env = new NameSpace();
		env.String = String;
		env.global = env;
		env.globalThis = env;
		env.console = logger.console;
		env.fs = new FileSystemNativeModule(fs);
		env.exit = (code: number) => client.notify('exit', code);

		env.Vector2 = Vector2;
		env.Error = Error;

		env.game = new Game(client);

		const { module } = await Process(codeShell, env, fs);

		mainModule = module;
	}
});


let mainModule: any;


client.notify('loaded');
