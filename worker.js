// example script
let log;

function setup(_log, outputs) {
	log = _log;
	log('setup');
	setTimeout(() => {
		outputs[0](false);
	}, 10000);
}

function destroy() {
	log('destroy');
}

const params = [
	{
		name: 'test-param',
		dataType: 'BOOLEAN',
		defaultValue: true,
		handler: val => log(`got param: ${val}`),
	},
];

const inputs = [
	{
		name: 'test-input',
		dataType: 'BOOLEAN',
		defaultValue: false,
		handler: val => log(`got input: ${val}`),
	},
];

const outputs = [
	{
		name: 'test-output',
		dataType: 'BOOLEAN',
		defaultValue: true,
	},
];

module.exports = { setup, destroy, params, inputs, outputs };
