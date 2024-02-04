//Part of the volex script used to configure the runtime for a script
const { DataType } = require('./enums.js');
const {
	paramsManager,
	inputsManager,
	outputsManager,
	callbacksManager,
} = require('./volex-core.js');

function param(obj) {
	return paramsManager.register(obj);
}

function input(obj) {
	return inputsManager.register(obj);
}

function output(obj) {
	return outputsManager.register(obj);
}

function onInit(cb) {
	callbacksManager.setOnInit(cb);
}

function onDestroy(cb) {
	callbacksManager.setOnDestroy(cb);
}

module.exports = {
	DataType,
	param,
	input,
	output,
	onInit,
	onDestroy,
};
