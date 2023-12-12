const BROKER_HOST = process.env.BROKER_HOST ?? 'localhost';
const BROKER_PORT = process.env.BROKER_PORT ?? 3000;
const BROKER_ADDR = `ws://${BROKER_HOST}:${BROKER_PORT}`;

module.exports = {
	BROKER_ADDR,
};
