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
const invert = param({
	name: 'invert-outputs',
	dataType: DataType.BOOLEAN,
	defaultValue: false,
	onChange(val) {
		update();
	},
});

const power = input({
	name: 'power-input',
	dataType: DataType.BOOLEAN,
	defaultValue: false,
	onChange: update,
});

const firstOutput = output({
	name: 'first-output',
	dataType: DataType.BOOLEAN,
	defaultValue: false,
});

const secondOutput = output({
	name: 'second-output',
	dataType: DataType.BOOLEAN,
	defaultValue: false,
});

// logic
function update() {
	const first = invert.value ? secondOutput : firstOutput;
	const second = invert.value ? firstOutput : secondOutput;

	first.value = power.value;
	second.value = !power.value;
}

onInit(function () {
	console.log('initializing...');
	update();
});

onDestroy(function () {
	console.log('destroyed');
});
