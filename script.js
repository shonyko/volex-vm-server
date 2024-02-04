// example script 2
const {
	DataType,
	param,
	input,
	output,
	onInit,
	onDestroy,
} = require('./volex.js');

// config
const delay = param({
	name: 'delay-param',
	dataType: DataType.BOOLEAN,
	defaultValue: true,
	onChange(val) {
		console.log(`got param: ${val}`);
		// motor.value = !motor.value;
	},
});

const power = input({
	name: 'power-input',
	dataType: DataType.BOOLEAN,
	defaultValue: false,
	onChange: val => console.log(`got input: ${val}`),
});

const led = output({
	name: 'led-output',
	dataType: DataType.BOOLEAN,
	defaultValue: true,
});

const motor = output({
	name: 'motor-output',
	dataType: DataType.BOOLEAN,
	defaultValue: false,
});

// logic
onInit(function () {
	console.log('initializing...');
	led.value = false;
	motor.value = true;
});

onDestroy(function () {
	console.log('destroyed');
});
