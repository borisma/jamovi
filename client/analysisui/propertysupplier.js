'use strict';

var _ = require('underscore');
var $ = require('jquery');
var Backbone = require('backbone');
var SuperClass = require('../common/superclass');

var PropertySupplier = function(properties) {

    Object.assign(this, Backbone.Events);

    this._propertySupplier_editting = 0;
    this._propertySupplier_eventsPending = {};

    this.registerComplexProperty = function(name, getter, setter, externalTrigger) {
        if (_.isUndefined(this.properties[name]) === false)
            return;

        this.properties[name] = { get: getter, set: setter, trigger: externalTrigger, externalTrigger: externalTrigger };
    };

    this.registerSimpleProperty = function(name, initialValue, filter, defined) {

        if (_.isUndefined(defined))
            defined = false;

        if (_.isUndefined(this.properties[name]) === false && this.properties[name].isDefined)
            return;

        let dataBound = this.isValueDataBound(initialValue);

        let properties = {
            trigger: name + "_changed",
            isDefined: defined,
            get: () => {
                return this.properties[name].value;
            },
            set: (value) => {
                var v = value;
                if (filter !== null && filter !== undefined)
                    v = filter.check(value);
                this.properties[name].value = v;
            },
            value: initialValue
        };

        if (dataBound) {
            properties.binding = initialValue;
            properties.value = null;
        }

        this.properties[name] = properties;
    };

    this.isValueDataBound = function(value) {
        if (typeof value === 'string')
            return value.startsWith('(') && value.endsWith(')');

        return false;
    };

    this.getPropertyValue = function(property) {

        var propertyObj = this.properties[property];
        if (_.isUndefined(propertyObj))
            throw "property '" + property + "' does not exist";

        var value = propertyObj.get.call(this);
        if ($.isFunction(value))
            return value.call(this);
        else
            return value;
    };

    this.setPropertyValue = function(property, value) {
        if (property === "name" || property === "type")
            throw "Cannot change the '" + property + "' property";

        var propertyObj = this.properties[property];
        if (_.isUndefined(propertyObj))
            throw "property '" + property + "' does not exist";

        var oldValue = propertyObj.get.call(this);
        if (oldValue !== value) {
            oldValue = propertyObj.set.call(this, value);
            if (_.isUndefined(propertyObj.externalTrigger))
                this.firePropertyChangedEvent(property);

            if (this.onPropertyChanged)
                this.onPropertyChanged(property);
        }
    };

    this.hasProperty = function(property) {
        return property in this.properties;
    };

    this.getTrigger = function(property) {
        return this.properties[property].trigger;
    };

    this.beginPropertyEdit = function() {
        this._propertySupplier_editting += 1;
    };

    this.endPropertyEdit = function() {
        if (this._propertySupplier_editting === 0)
            return;

        this._propertySupplier_editting -= 1;

        if (this._propertySupplier_editting === 0) {
            var self = this;
            _.each(this._propertySupplier_eventsPending, function(value, key, list) {
                self.firePropertyChangedEvent(key);
            });
            this._propertySupplier_eventsPending = { };
        }
    };

    this.firePropertyChangedEvent = function(property) {
        if (this._propertySupplier_editting > 0)
            this._propertySupplier_eventsPending[property] = true;
        else
            this.trigger(this.getTrigger(property));
    };

    this.properties = { };
    if (_.isUndefined(properties) === false && properties !== null) {
        if (typeof properties !== 'object' || Array.isArray(properties) === true)
            throw 'Properties can only be an object.';
        else {
            var self = this;
            _.each(properties, function(value, key, list) {
                self.registerSimpleProperty(key, value, null, true);
            });
        }
    }
};

SuperClass.create(PropertySupplier);

module.exports = PropertySupplier;
