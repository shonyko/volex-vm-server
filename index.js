const { Worker } = require('node:worker_threads');
const {
	setTransient,
	paramsManager,
	inputsManager,
	outputsManager,
} = require('./volex-core.js');

// Connection to broker
const { Events, Services, DataType } = require('./enums.js');
const io_client = require('socket.io-client');

const { BROKER_ADDR } = require('./config.js');

console.log(`Broker addr: ${BROKER_ADDR}`);
const socket = io_client(BROKER_ADDR);

function register() {
	socket.emit(
		Events.Socket.REGISTER,
		Services.FILE_SERVER,
		({ success, err }) => {
			if (!success) {
				console.log(`Could not register: `, err);
				console.log(`Retrying in 2 seconds`);
				return setTimeout(register, 2000);
			}
			socket.timeout(2000).emit(
				Events.MESSAGE,
				{
					to: Services.BACKEND,
					event: Events.VM_CONFIG,
				},
				(err, resp) => {
					err ??= resp.err;
					if (err) {
						console.log('Error while requesting active scripts:', err);
						return;
					}
					const agents = JSON.parse(resp.data);
					for (const { id, script } of agents) {
						startWorker(id, script);
					}
				}
			);
		}
	);
}

socket.on('connect', _ => {
	console.log('Socket connected!');
	register();
});

socket.on('connect_error', err => {
	console.log(`Could not connect due to `, err);
});

const workersMap = new Map();

function startWorker(agentId, script) {
	const worker = new Worker('./vm.js', {
		workerData: {
			id: agentId,
			script,
		},
	});

	// worker.on('message', m => console.log(`Message: ${m}`));
	worker.on('error', e => console.log(`Error: ${e}`));
	worker.on('exit', code => {
		console.log(`Worker for agent [${agentId}] stopped with exit code ${code}`);
	});

	workersMap.set(+agentId, worker);
}

function stopWorker(agentId) {
	agentId = +agentId;
	console.log(`Stopping worker for agent with id: ${agentId}`);
	const worker = workersMap.get(agentId);
	worker?.postMessage('close');
	workersMap.delete(agentId);
}

socket.on(Events.NEW_AGENT, ({ id, blueprintId, macAddr }) => {
	if (macAddr != null) {
		return;
	}

	socket.timeout(2000).emit(
		Events.MESSAGE,
		{
			to: Services.BACKEND,
			event: Events.BLUEPRINT_NAME,
			data: blueprintId,
		},
		(err, resp) => {
			err ??= resp.err;
			if (err) {
				return console.log(
					`Error while getting the name for blueprint with id ${id}:`,
					err
				);
			}
			const script = resp.data;
			if (!script) {
				return console.log(
					'Could not get blueprint name for blueprint with id:',
					blueprintId
				);
			}
			startWorker(id, script);
		}
	);
});

socket.on(Events.DEL_AGENT, stopWorker);

// Not synchronized if this service is down while user deletes the blueprint
socket.on(Events.DEL_BLUEPRINT, blueprintId => {
	socket.timeout(2000).emit(
		Events.MESSAGE,
		{
			to: Services.BACKEND,
			event: Events.BLUEPRINT_NAME,
			data: blueprintId,
		},
		(err, resp) => {
			err ??= resp.err;
			if (err) {
				return console.log(
					`Error while getting the name for blueprint with id ${id}:`,
					err
				);
			}
			const script = resp.data;
			if (!script) {
				return console.log(
					'Could not get blueprint name for blueprint with id:',
					blueprintId
				);
			}
			fs.unlinkSync(`./scripts/${script}`);
		}
	);
});

// FILE SERVER
setTransient(true);

const fs = require('fs');
const path = require('node:path');

const multer = require('multer');
const express = require('express');
const app = express();

const PORT = process.env.PORT ?? 80;

function loadScript(path) {
	path = `./${path}`;
	try {
		let text = fs.readFileSync(path);
		text = text
			.toLocaleString()
			.replace(/require\(.*volex.*\)/gi, "require('../volex.js')");
		fs.writeFileSync(path, text);
		return require(path);
	} catch (err) {
		console.log('error while loading script: ', err.toString());
	}
	return null;
}

// TODO: maybe do value checks depending on data type
function validate(arr) {
	return (
		arr != null &&
		Array.isArray(arr) &&
		arr.every(x => x.name && DataType[x.dataType] && x.defaultValue != null)
	);
}

app.use('/scripts', express.static('scripts'));

const upload = multer({ dest: 'scripts/' });
app.post('/scripts', upload.single('script'), (req, res) => {
	// TODO: maybe check file type
	if (!req.file) {
		return res.status(400).send('Script required');
	}
	if (!socket.connected) {
		fs.unlinkSync(req.file.path);
		return res.status(500).send('Not connected to bridge');
	}
	const file = req.file;
	const script = loadScript(file.path);
	const params = paramsManager.getAll();
	const inputs = inputsManager.getAll();
	const outputs = outputsManager.getAll();
	// // release memory
	// delete require.cache[require.resolve(path)];
	const isValid =
		script != null && validate(params) && validate(inputs) && validate(outputs);
	socket.timeout(2000).emit(
		Events.MESSAGE,
		{
			to: Services.BACKEND,
			event: Events.BLUEPRINT,
			data: {
				name: file.filename,
				displayName: req.body.name,
				params,
				inputs,
				outputs,
				// inputs: [
				// 	{
				// 		name: 'test-pin',
				// 		dataType: DataType.BOOLEAN,
				// 		defaultValue: 'true',
				// 	},
				// ],
				// outputs: [],
				// params: [
				// 	{
				// 		name: 'test-param',
				// 		dataType: DataType.INTEGER,
				// 		defaultValue: 0,
				// 	},
				// ],
				isValid,
			},
		},
		(err, resp) => {
			if (err) {
				console.log('Error while sending to backend:', err);
				return res.status(500).send('Could not process request');
			}
			if (resp.err) {
				return res.status(400).send(resp.err);
			}
			return res.sendStatus(204);
		}
	);
});

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
