
'use strict';

const _ = require('underscore');
const $ = require('jquery');
const Backbone = require('backbone');
Backbone.$ = $;
const Opt = require('./option');

const keyedQueue = function() {

    this.map = {};
    this._hasEvents = false;

    this.get = function(index) {
        return this.data[index];
    };

    this.getKeyLevel = function(keys) {
        if (_.isUndefined(keys))
            return 0;

        return keys.length;
    };

    this.push = function(key, obj) {
        this._hasEvents = true;
        let oldData = this.map[key];
        if (_.isUndefined(oldData) || obj.type === 'change' && this.getKeyLevel(obj.keys) === 0) {
            this.map[key] = { option: obj.option, events: [ obj ] };
            return;
        }

        this.processEvent(obj, oldData.events);
    };

    this.compareKeys = function(newKey, k2) {
        if (k2.length > newKey.length || newKey.length === 0)
            return { same: false, sibling: false };

        for (let i = 0; i < newKey.length; i++) {
            if (i === newKey.length.length - 1) {
                let isIndex = typeof(newKey[i]) === 'number';
                let sameType = typeof(newKey[i]) === typeof(k2[i]);
                if (sameType && newKey[i] === k2[i])
                    return { same: true, sibling: true, distance: 0 };
                else if (sameType && isIndex)
                    return { same: false, sibling: true, distance: newKey[i] - k2[i] };
                else
                    return { same: false, sibling: true, distance: null };
            }
            else
                return { same: false, sibling: false };
        }
    };

    this.processEvent = function(obj, oldData, startIndex) {

        if (_.isUndefined(startIndex))
            startIndex = oldData.length - 1;

        if (startIndex === -1) {
            oldData.push(obj);
            return;
        }

        let lastItem = oldData[startIndex];
        let compare = this.compareKeys(obj.keys, lastItem.keys);
        let unsafeDirection = -1;
        if (obj.type === 'change')
            unsafeDirection = 1;

        if (lastItem.type === obj.type && compare.sibling && compare.distance !== null && compare.distance <= lastItem.length) {
            if (obj.value)
                lastItem.value[compare.distance] = obj.value[0];

            if (compare.distance === lastItem.length)
                lastItem.length += 1;
        }
        else if (compare.sibling && compare.distance !== null && (unsafeDirection * compare.distance) >= 0)
            oldData.push(obj);
        else
            this.processEvent(obj, oldData, startIndex - 1);
    };

    this.contains = function(key) {
        return _.isUndefined(this.map[key]) === false;
    };

    this.hasEvents = function() {
        return this._hasEvents;
    };
};

const Options = function(def) {

    Object.assign(this, Backbone.Events);

    this._list = [];
    this._refList = { };
    this._refListIndex = 0;

    this._beginEdit = 0;
    this._serverQueuedEvents = new keyedQueue();

    this.initialize = function(def) {
        for (let i = 0;i < def.length; i++) {
            let item = def[i];

            if (item.default === undefined)
                item.default = null;

            let option = new Opt(item.default, item);

            this._list.push(option);
        }
    };

    this.beginEdit = function() {
        this._beginEdit += 1;
    };

    this.endEdit = function() {
        this._beginEdit -= 1;
        if (this._beginEdit === 0) {
            this.fireQueuedEvents();
        }
    };

    this.getOption = function(name) {

        let list = this._list;

        if ( ! list)
            return null;

        if ($.isNumeric(name))
            return list[name];

        let option = this._refList[name];

        if (option === undefined) {
            option = null;
            let i = this._refListIndex;
            for (; i < list.length; i++) {
                let optObj = list[i];
                this._refList[optObj.name] = optObj;
                if (optObj.name === name) {
                    option = optObj;
                    i += 1;
                    break;
                }
            }

            this._refListIndex = i;
        }

        return option;
    };

    this.setOptionValue = function(name, value, keys, eventParams) {

        if (_.isUndefined(eventParams)) {
            if (_.isUndefined(keys)) {
                keys = [];
                eventParams = Options.getDefaultEventParams();
            }
            else if (Array.isArray(keys) === false) {
                eventParams = keys;
                keys = [];
            }
            else
                eventParams = Options.getDefaultEventParams();
        }

        let option = null;
        if (name._value !== undefined && name._initialized !== undefined)
            option = name;
        else
            option = this.getOption(name);

        if (option === null || !option.setValue)
            return false;

        let eOpt = Opt.getDefaultEventParams();
        eOpt.force = eventParams.force;

        if (option.setValue(value, keys, eOpt) && eventParams.silent === false)
            this.onValueChanged(option, value, keys, "change");

        return true;
    };

    this.insertOptionValue = function(name, value, keys, eventParams) {

        if (_.isUndefined(eventParams))
            eventParams = Options.getDefaultEventParams();

        let option = null;
        if (name._value !== undefined && name._initialized !== undefined)
            option = name;
        else
            option = this.getOption(name);

        let eOpt = Opt.getDefaultEventParams("inserted");
        eOpt.force = eventParams.force;

        if (option.insertValueAt(value, keys, eOpt) && eventParams.silent === false)
            this.onValueChanged(option, value, keys, "insert");
    };

    this.removeOptionValue = function(name, keys, eventParams) {

        if (_.isUndefined(eventParams))
            eventParams = Options.getDefaultEventParams();

        let option = null;
        if (name._value !== undefined && name._initialized !== undefined)
            option = name;
        else
            option = this.getOption(name);

        let eOpt = Opt.getDefaultEventParams("removed");
        eOpt.force = eventParams.force;

        if (option.removeAt(keys, eOpt) && eventParams.silent === false)
            this.onValueChanged(option, null, keys, "remove");
    };

    this.onValueChanged = function(option, value, keys, type) {

        this._serverQueuedEvents.push(option.name, { option: option, keys: keys, type: type, value: [value], length: 1 });

        if (this._beginEdit === 0)
            this.fireQueuedEvents();
    };

    this.fireQueuedEvents = function() {

        if (this._serverQueuedEvents.hasEvents()) {
            this.trigger("options.valuesForServer", this._serverQueuedEvents);
            this._serverQueuedEvents = new keyedQueue();
        }
    };

    this.initialize(def);
};

Options.getDefaultEventParams = function() {
    return {
        force: false,
        silent: false,
        data: null
     };
};

module.exports = Options;
