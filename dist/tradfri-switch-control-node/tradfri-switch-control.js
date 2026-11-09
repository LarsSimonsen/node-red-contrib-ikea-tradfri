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
const message_type_1 = require("../common/message-type");
const tradfriSwitchControlActionType = t.union([t.literal('on'), t.literal('off')], 'TradfriSwitchControlAction');
const tradfriSwitchControlMessageType = t.intersection([
    t.partial({
        topic: t.union([t.Int, t.array(t.Int)]),
        payload: tradfriSwitchControlActionType,
    }),
    message_type_1.messageType,
], 'TradfriSwitchControlMessage');
module.exports = (RED) => {
    const tradfriSwitchControlNodeConstructor = function (nodeDef) {
        var _a, _b;
        RED.nodes.createNode(this, nodeDef);
        this.gateway = RED.nodes.getNode(nodeDef.gateway);
        this.action = nodeDef.action;
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
            const maybeSwitchControlMessage = tradfriSwitchControlMessageType.decode(message);
            if ((0, Either_1.isLeft)(maybeSwitchControlMessage) && this.logInputErrors) {
                this.warn(`Invalid message received, using node config!\n${PathReporter_1.PathReporter.report(maybeSwitchControlMessage).join('\n')}`);
            }
            const switchControlMessage = (0, Either_1.isLeft)(maybeSwitchControlMessage)
                ? {}
                : maybeSwitchControlMessage.right;
            const action = switchControlMessage.payload || this.action;
            const instanceIds = Array.isArray(switchControlMessage.topic)
                ? switchControlMessage.topic
                : typeof switchControlMessage.topic === 'number'
                    ? [switchControlMessage.topic]
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
            this.log(`Turning ${action} accessories: [${accessoryIds.join()}] and groups: [${groupIds.join()}]`);
            switch (action) {
                case 'on':
                    Promise.all([
                        ...Array.from(this.gateway.accessories.values())
                            .filter((accessory) => accessoryIds.includes(accessory.instanceId))
                            .map((accessory) => {
                            var _a, _b;
                            return Promise.allSettled([
                                ...(((_a = accessory.lightList) === null || _a === void 0 ? void 0 : _a.map((l) => l.turnOn())) || []),
                                ...(((_b = accessory.plugList) === null || _b === void 0 ? void 0 : _b.map((p) => p.turnOn())) || []),
                            ]);
                        }),
                        ...Array.from(this.gateway.groups.values())
                            .filter((group) => groupIds.includes(group.instanceId))
                            .map((group) => Promise.allSettled([group.turnOn()])),
                    ])
                        .then((results) => {
                        this.log(`"On" action result: ${JSON.stringify(results.flat())}`);
                    })
                        .catch((err) => {
                        this.error(`"On" action error: ${String(err)}`, message);
                    });
                    break;
                case 'off':
                    Promise.all([
                        ...Array.from(this.gateway.accessories.values())
                            .filter((accessory) => accessoryIds.includes(accessory.instanceId))
                            .map((accessory) => {
                            var _a, _b;
                            return Promise.allSettled([
                                ...(((_a = accessory.lightList) === null || _a === void 0 ? void 0 : _a.map((l) => l.turnOff())) || []),
                                ...(((_b = accessory.plugList) === null || _b === void 0 ? void 0 : _b.map((p) => p.turnOff())) || []),
                            ]);
                        }),
                        ...Array.from(this.gateway.groups.values())
                            .filter((group) => groupIds.includes(group.instanceId))
                            .map((group) => Promise.allSettled([group.turnOff()])),
                    ])
                        .then((results) => {
                        this.log(`"Off" action result: ${JSON.stringify(results.flat())}`);
                    })
                        .catch((err) => {
                        this.error(`"Off" action error: ${String(err)}`, message);
                    });
                    break;
                default:
                    this.error(`Unsupported tradfri-control action: "${action}"`);
                    return;
            }
        });
    };
    RED.nodes.registerType('tradfri-switch-control', tradfriSwitchControlNodeConstructor);
};
