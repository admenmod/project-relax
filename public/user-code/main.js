const { Event } = await require('events');


const RULES_ENAM = {
	HARVESTER: 'harvester'
};

console.log({ RULES_ENAM });


module.exports = { aa: 33 };

module.exports.loop = async () => {
	let list = await game.getUnitsInfo();

	if(list.length) {
		list[0].moveTo(new Vector2(2, 4));
	}

	// Game.spawns['Spawn1'].buildUnit([WORK, CARRY, MOVE], 'Harvester1', {
	// 	memory: {
	// 		rule: RULES_ENAM.HARVESTER
	// 	}
	// });
	//
	// Game.units['Harvester1'];
};
