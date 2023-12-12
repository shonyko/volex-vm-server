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

// FILE SERVER
const fs = require('fs');
const path = require('node:path');

const multer = require('multer');
const express = require('express');
const app = express();

const PORT = process.env.PORT ?? 80;

function loadScript(path) {
	try {
		return require(`./${path}`);
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
	// TODO: maybe release memory after using what's needed
	const script = loadScript(file.path);
	const inputs = script?.inputs ?? [];
	const outputs = script?.outputs ?? [];
	const params = script?.params ?? [];
	const isValid =
		script != null &&
		validate(script.params) &&
		validate(script.inputs) &&
		validate(script.outputs);
	socket.timeout(2000).emit(
		Events.MESSAGE,
		{
			to: Services.BACKEND,
			event: Events.BLUEPRINT,
			data: {
				name: file.filename,
				displayName: req.body.name,
				inputs,
				outputs,
				params,
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
				console.log('Error while sending to backend: ', err);
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
