"use strict";
const tradfri_state_to_payload_1 = require("../common/tradfri-state-to-payload");
module.exports = (RED) => {
    const tradfriMonitorNodeConstructor = function (nodeDef) {
        RED.nodes.createNode(this, nodeDef);
        this.gateway = RED.nodes.getNode(nodeDef.gateway);
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
        this.gateway.client.on('device updated', (accessory) => {
            const message = {
                topic: accessory.instanceId,
                payload: {
                    event: 'device updated',
                    ...(0, tradfri_state_to_payload_1.createDeviceState)(accessory),
                },
            };
            this.send(message);
        });
        this.gateway.client.on('device removed', (instanceId) => {
            const message = {
                topic: instanceId,
                payload: {
                    event: 'device removed',
                    instanceId,
                },
            };
            this.send(message);
        });
        this.gateway.client.on('group updated', (group) => {
            const message = {
                topic: group.instanceId,
                payload: {
                    event: 'group updated',
                    ...(0, tradfri_state_to_payload_1.createGroupState)(group),
                },
            };
            this.send(message);
        });
        this.gateway.client.on('group removed', (instanceId) => {
            const message = {
                topic: instanceId,
                payload: {
                    event: 'group removed',
                    instanceId,
                },
            };
            this.send(message);
        });
    };
    RED.nodes.registerType('tradfri-monitor', tradfriMonitorNodeConstructor);
};
