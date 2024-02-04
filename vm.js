const { parentPort, workerData } = require('node:worker_threads');
const {
	paramsManager,
	inputsManager,
	outputsManager,
	callbacksManager,
} = require('./volex-core.js');

const { id, script } = workerData;
const VM_ID = `${script}-${id}`;
const _log = console.log;
console.log = (...args) => _log(`[${VM_ID}]:`, ...args);
console.log(`VM starting script: ${script} for agent with id ${id}`);
require(`./scripts/${script}`);

const { Events } = require('./enums.js');
const { MQTT_ADDR } = require('./config.js');
const mqtt = require('mqtt');
const client = mqtt.connect(MQTT_ADDR);

// Mqtt error calback
client.on('error', err => {
	console.log(`[MQTT] An error occured: `, err);
	this.client.end();
});

// Connection callback
client.on('connect', _ => {
	console.log(`mqtt client connected`);
	const macAddr = VM_ID;
	client.subscribe(macAddr, { qos: 0, nl: true });
	client.publish(Events.CONFIG, macAddr);
});

// When a message arrives, console.log it
client.on('message', (topic, message) => {
	const json = message.toString();
	console.log(`received: [${topic}]: ${json}`);
	const data = JSON.parse(json);

	const parts = /^(pin|param)?\/?(.+?)(\/src)?$/.exec(topic).slice(1);
	const pinId = +parts[1];
	if (parts[0] === 'pin') {
		if (parts[2] === '/src') {
			// we got pin src
			// console.log(`VM [${VM_ID}] got pin src:`, data);
			inputsManager.updateSrc(pinId, data);
			return;
		}
		// we got pin value
		// console.log(`VM [${VM_ID}] got pin value:`, data);
		inputsManager.update(pinId, data);
		outputsManager.update(pinId, data);
		return;
	}
	if (parts[0] === 'param') {
		// we got param value
		// console.log(`VM [${VM_ID}] got param value:`, data);
		paramsManager.update(pinId, data);
		return;
	}

	//we got config
	// console.log(`VM [${VM_ID}] got config:`, data);
	const config = data;
	paramsManager.bindParams(config.params);
	inputsManager.bindInputs(config.inputs);
	outputsManager.bindOutputs(config.outputs);
	outputsManager.onSend((id, val) => {
		const topic = `pin/${id}`;
		console.log(`sending [${topic}]:`, val);
		// TODO: maybe check for val type
		if (typeof val !== 'string') {
			val = `${val}`;
		}
		client.publish(topic, val);
	});
	callbacksManager.init();

	// # - multi  level
	// + - single level
	// maybe listen for only required ones
	client.subscribe('pin/#', { qos: 0, nl: true });
	client.subscribe('param/#', { qos: 0, nl: true });
});

client.on('close', () => {
	console.log(`mqtt client disconnected`);
	callbacksManager.destroy();
});

parentPort.addListener('message', _ => {
	console.log('Closing...');
	client.end(_ => parentPort.close());
});
