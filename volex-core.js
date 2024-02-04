const { DataType } = require('./enums.js');

// Core part of the volex script for storing script related data
let params = [];
let inputs = [];
let outputs = [];
let onInit = null;
let onDestroy = null;

let isTransient = false;

function setTransient(val) {
	isTransient = val;
}

function parseValue(dataType, value) {
	switch (dataType) {
		case DataType.BOOLEAN:
			value = /true/i.test(value);
			break;
		default:
			console.log('unknown data type:', this.content.dataType);
			break;
	}
	return value;
}

class Wrapper {
	constructor(content, writeCb) {
		this.content = content;
		this.val = content.defaultValue;
		this.cb = content.onChange ?? writeCb;
		this.id = null;
	}

	get value() {
		return this.val;
	}

	set value(val) {
		this.val = parseValue(this.content.dataType, val);
		this.cb?.(this.id, val);
	}

	initVal(val) {
		this.val = parseValue(this.content.dataType, val);
	}

	setId(id) {
		this.id = id;
	}
}

class ParamsManager {
	constructor() {
		if (!isTransient) {
			this.map = new Map();
		}
	}

	register(param) {
		const wrapper = isTransient ? param : new Wrapper(param);
		params.push(wrapper);
		return wrapper;
	}

	getAll() {
		const res = params;
		if (isTransient) {
			params = [];
		}
		return res;
	}

	bindParams(ps) {
		if (isTransient) return;
		for (let i = 0; i < ps.length; i++) {
			const { id, value } = ps[i];
			params[i].setId(id);
			this.map.set(id, params[i]);
			params[i].initVal(value);
		}
	}

	update(id, value) {
		const p = this.map.get(id);
		if (p) {
			p.value = value;
		}
	}
}

class InputsManager {
	constructor() {
		if (!isTransient) {
			this.map = new Map();
		}
	}

	register(input) {
		const wrapper = isTransient ? input : new Wrapper(input);
		inputs.push(wrapper);
		return wrapper;
	}

	getAll() {
		const res = inputs;
		if (isTransient) {
			inputs = [];
		}
		return res;
	}

	bindInputs(is) {
		if (isTransient) return;
		for (let i = 0; i < is.length; i++) {
			const { id, value, src } = is[i];
			inputs[i].setId(id);
			this.map.set(id, inputs[i]);
			this.map.set(src, inputs[i]);
			inputs[i].initVal(value);
			inputs[i].src = src;
		}
	}

	update(id, value) {
		const i = this.map.get(id);
		if (i) {
			i.value = value;
		}
	}

	updateSrc(id, { id: src, value }) {
		const i = this.map.get(id);
		if (i) {
			const oldSrc = i.src;
			this.map.delete(oldSrc);
			this.map.set(src, i);
			i.src = src;
			i.value = value;
		}
	}
}

class OutputsManager {
	constructor() {
		if (!isTransient) {
			this.map = new Map();
		}
	}

	register(output) {
		const wrapper = isTransient
			? output
			: new Wrapper(output, (id, val) => this.sendCb?.(id, val));
		outputs.push(wrapper);
		return wrapper;
	}

	getAll() {
		const res = outputs;
		if (isTransient) {
			outputs = [];
		}
		return res;
	}

	bindOutputs(os) {
		if (isTransient) return;
		for (let i = 0; i < os.length; i++) {
			const id = os[i];
			outputs[i].setId(id);
			this.map.set(id, outputs[i]);
		}
	}

	update(id, value) {
		const o = this.map.get(id);
		if (o) {
			o.val = value;
		}
	}

	onSend(cb) {
		this.sendCb = cb;
	}
}

class CallbacksManager {
	setOnInit(cb) {
		onInit = cb;
	}

	setOnDestroy(cb) {
		onDestroy = cb;
	}

	init() {
		onInit?.();
	}

	destroy() {
		onDestroy?.();
	}
}

const paramsManager = new ParamsManager();
const inputsManager = new InputsManager();
const outputsManager = new OutputsManager();
const callbacksManager = new CallbacksManager();

module.exports = {
	setTransient,
	paramsManager,
	inputsManager,
	outputsManager,
	callbacksManager,
};
