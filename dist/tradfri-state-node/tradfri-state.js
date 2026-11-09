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
const t = __importStar(require("io-ts"));
const Either_1 = require("fp-ts/lib/Either");
const PathReporter_1 = require("io-ts/lib/PathReporter");
const message_type_1 = require("../common/message-type");
const tradfri_state_to_payload_1 = require("../common/tradfri-state-to-payload");
const tradfriStateInputMessageType = t.intersection([
    t.partial({
        topic: t.union([t.Int, t.array(t.Int)]),
    }),
    message_type_1.messageType,
], 'TradfriStateInputMessage');
module.exports = (RED) => {
    const tradfriStateNodeConstructor = function (nodeDef) {
        var _a, _b;
        RED.nodes.createNode(this, nodeDef);
        this.gateway = RED.nodes.getNode(nodeDef.gateway);
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
        this.on('input', (inputMessage) => {
            const maybeStateMessage = tradfriStateInputMessageType.decode(inputMessage);
            if ((0, Either_1.isLeft)(maybeStateMessage) && this.logInputErrors) {
                this.warn(`Invalid message received, using node config!\n${PathReporter_1.PathReporter.report(maybeStateMessage).join('\n')}`);
            }
            const stateMessage = (0, Either_1.isLeft)(maybeStateMessage)
                ? {}
                : maybeStateMessage.right;
            const instanceIds = Array.isArray(stateMessage.topic)
                ? stateMessage.topic
                : typeof stateMessage.topic === 'number'
                    ? [stateMessage.topic]
                    : [];
            const accessoryIds = [
                ...instanceIds.filter((instanceId) => this.gateway.accessories.has(instanceId)),
                ...(this.accessories || []),
            ];
            const groupIds = [
                ...instanceIds.filter((instanceId) => this.gateway.groups.has(instanceId)),
                ...(this.groups || []),
            ];
            if (!accessoryIds.length && !groupIds.length) {
                this.warn('No accessories or groups in message or node configuration!');
                return;
            }
            this.log(`Retrieving current state of accessories: [${accessoryIds.join()}] and groups: [${groupIds.join()}]`);
            const outputMessage = {
                topic: [...accessoryIds, ...groupIds],
                payload: {
                    ...accessoryIds.reduce((cummulativeDeviceState, instanceId) => {
                        const accessory = this.gateway.accessories.get(instanceId);
                        if (!accessory) {
                            return cummulativeDeviceState;
                        }
                        return {
                            ...cummulativeDeviceState,
                            [instanceId]: (0, tradfri_state_to_payload_1.createDeviceState)(accessory),
                        };
                    }, {}),
                    ...groupIds.reduce((cummulativeGroupState, instanceId) => {
                        const group = this.gateway.groups.get(instanceId);
                        if (!group) {
                            return cummulativeGroupState;
                        }
                        return {
                            ...cummulativeGroupState,
                            [instanceId]: (0, tradfri_state_to_payload_1.createGroupState)(group),
                        };
                    }, {}),
                },
            };
            this.send(outputMessage);
        });
    };
    RED.nodes.registerType('tradfri-state', tradfriStateNodeConstructor);
};
