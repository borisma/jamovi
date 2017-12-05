
'use strict';

const _ = require('underscore');
const $ = require('jquery');
const Backbone = require('backbone');
Backbone.$ = $;

const Action = Backbone.Model.extend({
    defaults: {
        enabled: true,
    },
    do() {
        this.trigger('request');
    },
    isEnabled() {
        return this.attributes.enabled;
    },
    isDisabled() {
        return ! this.attributes.enabled;
    },
});

class ActionHub {

    constructor() {
        this._actions = { };
    }

    get(actionName) {
        let action = this._actions[actionName];
        if (action === undefined) {
            action = new Action();
            this._actions[actionName] = action;
        }
        return action;
    }
}



module.exports = new ActionHub();
