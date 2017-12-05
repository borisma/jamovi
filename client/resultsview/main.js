'use strict';

const _ = require('underscore');
const $ = require('jquery');
const Backbone = require('backbone');
Backbone.$ = $;

const ERDM = require("element-resize-detector");

const createItem = require('./create').createItem;



class Main {  // this is constructed at the bottom

    constructor() {
        this.mainWindow = null;
        this.results = null;
        this.$results = null;
        this.resultsDefn = null;
        this.active = null;

        window.addEventListener('message', event => this._messageEvent(event));

        this._notifyResize = _.debounce(() => this._reallyNotifyResize(), 50);

        window.setOption = (name, value) => {
            this.mainWindow.postMessage({
                type : 'setOption',
                data : { name, value }}, '*');
        };

        window.setCustom = (address, options) => {
            this.mainWindow.postMessage({
                type : 'setCustom',
                data : { address, options }}, '*');
        };

        $(document).ready(() => {
            this.$body = $('body');
        });
    }

    _reallyNotifyResize() {
        let width  = this.$results.width()  + 20;
        let height = this.$results.height() + 25;

        this.mainWindow.postMessage({
            type : 'sizeChanged',
            data : { width: width, height: height }}, '*');
    }

    _sendMenuRequest(event) {
        let entries = event.data.entries;
        entries[0].type = 'Analysis';

        this.mainWindow.postMessage(event, '*');

        let lastEntry = entries[entries.length-1];
        this._menuEvent({ type: 'activated', address: lastEntry.address });
    }

    _sendClipboardContent(data) {
        this.mainWindow.postMessage({
            type : 'clipboardCopy',
            data : data }, '*');
    }

    _messageEvent(event) {

        if (event.source === window)
            return;

        this.mainWindow = event.source;
        let hostEvent = event.data;
        let eventData = hostEvent.data;

        if (hostEvent.type === 'results') {
            this.resultsDefn = eventData;
            this._render();
        }
        else if (hostEvent.type === 'click') {
            let el = document.elementFromPoint(hostEvent.pageX, hostEvent.pageY);
            if (el !== null) {
                let clickEvent = $.Event('contextmenu');
                clickEvent.pageX = hostEvent.pageX;
                clickEvent.pageY = hostEvent.pageY;
                $(el).trigger(clickEvent);
            }
        }
        else if (hostEvent.type === 'menuEvent') {
            this._menuEvent(eventData);
        }
    }

    _render() {
        this.$body.attr('data-mode', this.resultsDefn.mode);
        this.$body.empty();

        this.$results = $('<div id="results"></div>');
        this.results = createItem(
            this.resultsDefn.results,
            this.$results,
            0,
            { _sendEvent: event => this._sendMenuRequest(event) },
            this.resultsDefn.mode,
            this.resultsDefn.devMode,
            this.resultsDefn.format);
        this.$results.appendTo(this.$body);

        this.$selector = $('<div id="selector"></div>').appendTo(this.$body);

        $(document).ready(() => {
            let erd = ERDM({ strategy: 'scroll' });
            erd.listenTo(this.$results[0], (element) => {
                this._notifyResize();
            });
        });
    }

    _menuEvent(event) {

        if (this.active !== null) {
            this.$selector.css('opacity', '0');
            this.active = null;
        }

        if (event.address === null)
            return;

        let address = event.address;

        if (address.length === 0) {
            this.active = this.results;
        }
        else {
            this.active = this.results.get(address);
        }

        switch (event.type) {
            case 'selected':
                if (event.op === 'copy') {
                    let clipboard = this.active.asClipboard();
                    this._sendClipboardContent(clipboard);
                }
                break;
            case 'activated':
                let pos = this.active.$el.offset();
                let width = this.active.$el.outerWidth();
                let height = this.active.$el.outerHeight();
                let padTB = 0;
                let padLR = 12;

                if (this.active.$el.is(this.$results))
                    padTB = padLR = 0;

                this.$selector.css({
                    left:   pos.left - padLR,
                    top:    pos.top  - padTB,
                    width:  width  + 2 * padLR,
                    height: height + 2 * padTB,
                    opacity: 1 });
                break;
        }
    }
}

new Main();  // constructed down here!
