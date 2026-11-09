"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
require("core-js/es/promise/all-settled");
require("core-js/es/array/flat");
const t = __importStar(require("io-ts"));
const PathReporter_1 = require("io-ts/PathReporter");
const Either_1 = require("fp-ts/lib/Either");
const node_tradfri_client_1 = require("node-tradfri-client");
const message_type_1 = require("../common/message-type");
const types_1 = require("../common/types");
const tradfriBlindControlActionType = t.partial({
    operation: t.union([t.literal('setPosition'), t.literal('stop')]),
    position: types_1.blindPositionType,
}, 'TradfriBlindControlAction');
const tradfriBlindControlMessageType = t.intersection([
    t.partial({
        topic: t.union([t.Int, t.array(t.Int)]),
        payload: tradfriBlindControlActionType,
    }),
    message_type_1.messageType,
], 'TradfriBlindControlMessage');
module.exports = (RED) => {
    const tradfriBlindControlNodeConstructor = function (nodeDef) {
        var _a, _b;
        RED.nodes.createNode(this, nodeDef);
        this.gateway = RED.nodes.getNode(nodeDef.gateway);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.action = nodeDef.action ? JSON.parse(nodeDef.action) : {};
        this.accessories = (_a = nodeDef.accessories) === null || _a === void 0 ? void 0 : _a.map((id) => Number(id));
        this.groups = (_b = nodeDef.groups) === null || _b === void 0 ? void 0 : _b.map((id) => Number(id));
        this.logInputErrors = nodeDef.logInputErrors;
        const setConnected = () => {
            this.status({ fill: 'green', shape: 'dot', text: 'connected' });
        };
        const setDisconnected = () => {
            this.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
        };
        const setConnecting = () => {
            this.status({ fill: 'yellow', shape: 'ring', text: 'connecting...' });
        };
        setConnecting();
        this.gateway.client
            .on('connection alive', setConnected)
            .on('connection lost', setDisconnected)
            .on('connection failed', setDisconnected)
            .on('reconnecting', setConnecting)
            .on('ping succeeded', setConnected)
            .on('ping failed', setDisconnected)
            .ping()
            .catch((err) => {
            this.error(`Unable to ping gateway! ${String(err)}`);
        });
        this.on('close', () => {
            this.gateway.client
                .off('connection alive', setConnected)
                .off('connection lost', setDisconnected)
                .off('connection failed', setDisconnected)
                .off('reconnecting', setConnecting)
                .off('ping succeeded', setConnected)
                .off('ping failed', setDisconnected);
        });
        this.on('input', (message) => {
            const maybeBlindControlMessage = tradfriBlindControlMessageType.decode(message);
            if ((0, Either_1.isLeft)(maybeBlindControlMessage) && this.logInputErrors) {
                this.warn(`Invalid message received, using node config!\n${PathReporter_1.PathReporter.report(maybeBlindControlMessage).join('\n')}`);
            }
            const blindControlMessage = (0, Either_1.isLeft)(maybeBlindControlMessage)
                ? {}
                : maybeBlindControlMessage.right;
            const action = {
                ...(this.action || {}),
                ...(blindControlMessage.payload || {}),
            };
            const instanceIds = Array.isArray(blindControlMessage.topic)
                ? blindControlMessage.topic
                : typeof blindControlMessage.topic === 'number'
                    ? [blindControlMessage.topic]
                    : [];
            const accessoryIds = [
                ...instanceIds.filter((instanceId) => this.gateway.accessories.has(instanceId)),
                ...(this.accessories || []),
            ];
            const groupIds = [
                ...instanceIds.filter((instanceId) => this.gateway.groups.has(instanceId)),
                ...(this.groups || []),
            ];
            if (!action) {
                this.warn('No action set in message or node configuration!');
                return;
            }
            if (!accessoryIds.length && !groupIds.length) {
                this.warn('No accessories or groups in message or node configuration!');
                return;
            }
            if (!action.operation) {
                this.warn('No blind operation found in message or node configuration!');
                return;
            }
            if (action.operation === 'setPosition' && action.position === undefined) {
                this.warn('Blind operation "setPosition" requires a position and none was found in the message or node configuration!');
                return;
            }
            this.log(`Sending ${JSON.stringify(action)} to accessories: [${accessoryIds.join()}] and groups: [${groupIds.join()}]`);
            const operation = {
                position: action.operation === 'setPosition' && action.position !== undefined
                    ? action.position
                    : undefined,
                trigger: action.operation === 'stop' ? 0 : undefined,
            };
            // We need to delete all the properties we do not use
            for (const key of Object.keys(operation)) {
                if (operation[key] === undefined) {
                    delete operation[key];
                }
            }
            this.log(`Executing operation: ${JSON.stringify(operation)}`);
            Promise.allSettled([
                ...Array.from(this.gateway.accessories.values())
                    .filter((accessory) => accessoryIds.includes(accessory.instanceId) &&
                    accessory.type === node_tradfri_client_1.AccessoryTypes.blind)
                    .map((accessory) => this.gateway.client.operateBlind(accessory, operation)),
                ...Array.from(this.gateway.groups.values())
                    .filter((group) => groupIds.includes(group.instanceId))
                    // A group's cached state is the last group command the gateway saw,
                    // not the state of its devices. Send the whole operation every time
                    // (as Group#turnOn and friends do), or a command that matches the
                    // stale cache is silently dropped.
                    .map((group) => this.gateway.client.operateGroup(group, operation, true)),
            ])
                .then((results) => {
                this.log(`Blind action result: ${JSON.stringify(results)}`);
            })
                .catch((err) => {
                this.error(`Blind action error: ${String(err)}`, message);
            });
        });
    };
    RED.nodes.registerType('tradfri-blind-control', tradfriBlindControlNodeConstructor);
};
