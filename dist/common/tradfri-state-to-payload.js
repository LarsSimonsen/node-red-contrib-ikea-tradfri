"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupState = exports.createDeviceState = exports.powerSourceMap = exports.deviceTypeMap = void 0;
const node_tradfri_client_1 = require("node-tradfri-client");
exports.deviceTypeMap = {
    [node_tradfri_client_1.AccessoryTypes.blind]: 'blind',
    [node_tradfri_client_1.AccessoryTypes.lightbulb]: 'lightbulb',
    [node_tradfri_client_1.AccessoryTypes.motionSensor]: 'motionSensor',
    [node_tradfri_client_1.AccessoryTypes.plug]: 'plug',
    [node_tradfri_client_1.AccessoryTypes.remote]: 'remote',
    [node_tradfri_client_1.AccessoryTypes.signalRepeater]: 'signalRepeater',
    [node_tradfri_client_1.AccessoryTypes.slaveRemote]: 'slaveRemote',
    [node_tradfri_client_1.AccessoryTypes.soundRemote]: 'soundRemote',
    [node_tradfri_client_1.AccessoryTypes.airPurifier]: 'airPurifier',
};
exports.powerSourceMap = {
    [node_tradfri_client_1.PowerSources.Unknown]: 'Unknown',
    [node_tradfri_client_1.PowerSources.InternalBattery]: 'InternalBattery',
    [node_tradfri_client_1.PowerSources.ExternalBattery]: 'ExternalBattery',
    [node_tradfri_client_1.PowerSources.Battery]: 'Battery',
    [node_tradfri_client_1.PowerSources.PowerOverEthernet]: 'PowerOverEthernet',
    [node_tradfri_client_1.PowerSources.USB]: 'USB',
    [node_tradfri_client_1.PowerSources.AC_Power]: 'ACPower',
    [node_tradfri_client_1.PowerSources.Solar]: 'Solar',
};
const createDeviceState = (accessory) => ({
    type: exports.deviceTypeMap[accessory.type],
    instanceId: accessory.instanceId,
    name: accessory.name,
    alive: accessory.alive,
    lastSeen: new Date(accessory.lastSeen * 1000).toISOString(),
    deviceInfo: {
        ...accessory.deviceInfo,
        power: exports.powerSourceMap[accessory.deviceInfo.power],
    },
    otaUpdateState: accessory.otaUpdateState,
    blind: accessory.type === node_tradfri_client_1.AccessoryTypes.blind
        ? {
            position: accessory.blindList[0].position,
            trigger: accessory.blindList[0].trigger,
        }
        : undefined,
    lightbulb: accessory.type === node_tradfri_client_1.AccessoryTypes.lightbulb
        ? {
            color: accessory.lightList[0].color,
            colorTemperature: accessory.lightList[0].colorTemperature,
            dimmer: accessory.lightList[0].dimmer,
            hue: accessory.lightList[0].hue,
            isDimmable: accessory.lightList[0].isDimmable,
            isOn: accessory.lightList[0].onOff,
            saturation: accessory.lightList[0].saturation,
            spectrum: accessory.lightList[0].spectrum,
            unit: accessory.lightList[0].unit,
        }
        : undefined,
    sensor: accessory.type === node_tradfri_client_1.AccessoryTypes.motionSensor
        ? {
            appType: accessory.sensorList[0].appType,
            maxMeasuredValue: accessory.sensorList[0].maxMeasuredValue,
            maxRangeValue: accessory.sensorList[0].maxRangeValue,
            minMeasuredValue: accessory.sensorList[0].minMeasuredValue,
            minRangeValue: accessory.sensorList[0].minRangeValue,
            resetMinMaxMeasureValue: accessory.sensorList[0].resetMinMaxMeasureValue,
            sensorType: accessory.sensorList[0].sensorType,
            sensorValue: accessory.sensorList[0].sensorValue,
            unit: accessory.sensorList[0].unit,
        }
        : undefined,
    plug: accessory.type === node_tradfri_client_1.AccessoryTypes.plug
        ? {
            cumulativeActivePower: accessory.plugList[0].cumulativeActivePower,
            dimmer: accessory.plugList[0].dimmer,
            isDimmable: accessory.plugList[0].isDimmable,
            isOn: accessory.plugList[0].onOff,
            isSwitchable: accessory.plugList[0].isSwitchable,
            onTime: accessory.plugList[0].onTime,
            powerFactor: accessory.plugList[0].powerFactor,
        }
        : undefined,
});
exports.createDeviceState = createDeviceState;
const createGroupState = (group) => ({
    type: 'group',
    instanceId: group.instanceId,
    deviceIds: group.deviceIDs,
    sceneId: group.sceneId,
    name: group.name,
    isOn: group.onOff,
    dimmer: group.dimmer,
    position: group.position,
    transitionTime: group.transitionTime,
    createdAt: new Date(group.createdAt * 1000).toISOString(),
    trigger: group.trigger,
});
exports.createGroupState = createGroupState;
