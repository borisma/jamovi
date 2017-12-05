
'use strict';

const $ = require('jquery');
const _ = require('underscore');

const LayoutGrid = require('./layoutgrid').Grid;
const EnumPropertyFilter = require('./enumpropertyfilter');
const GridControl = require('./gridcontrol');
const LayoutGridBorderSupport = require('./layoutgridbordersupport');

const LayoutCollapseView = function(params) {

    GridControl.extendTo(this, params);
    LayoutGrid.extendTo(this);
    LayoutGridBorderSupport.extendTo(this);

    this.registerSimpleProperty("collapsed", false);
    this.registerSimpleProperty("label", null);
    this.registerSimpleProperty("stretchFactor", 1);

    this._collapsed = this.getPropertyValue('collapsed');

    this._body = null;

    this.createItem = function() {
        this.$el.addClass("silky-layout-container silky-options-group silky-options-group-style-list silky-control-margin-" + this.getPropertyValue("margin"));

        let groupText = this.getPropertyValue('label');
        let t = '<div class="silky-options-collapse-icon" style="display: inline;"> <span class="silky-dropdown-toggle"></span></div>';
        this.$header = $('<div class="silky-options-collapse-button silky-control-margin-' + this.getPropertyValue("margin") + '" style="white-space: nowrap;">' + t + groupText + '</div>');

        if (this._collapsed)
            this.$header.addClass("silky-gridlayout-collapsed");

        this._headerCell = this.addCell(0, 0, false, this.$header);
        this._headerCell.setStretchFactor(1);

        this.$header.on('click', null, this, function(event) {
            let group = event.data;
            group.toggleColapsedState();
        });
    };

    this.setBody = function(body) {
        this._body = body;
        body.$el.addClass("silky-control-body");
        let data = body.renderToGrid(this, 1, 0);
        this._bodyCell = data.cell;
        this.setContentVisibility(this._collapsed === false);
        return data.cell;
    };

    this.collapse = function() {

        if (this._collapsed)
            return;

        this.$header.addClass("silky-gridlayout-collapsed");

        this.setContentVisibility(false);
        this._headerCell.invalidateContentSize();
        this.invalidateLayout('both', Math.random());
        this._collapsed = true;
    };

    this.setContentVisibility = function(visible) {
        this._bodyCell.setVisibility(visible);
    };

    this.expand = function() {

        if ( ! this._collapsed)
            return;

        this.$header.removeClass("silky-gridlayout-collapsed");

        this.setContentVisibility(true);
        this._headerCell.invalidateContentSize();
        this.invalidateLayout('both', Math.random(), true);
        this._collapsed = false;

    };

    this.toggleColapsedState = function() {
        if (this._collapsed)
            this.expand();
        else
            this.collapse();
    };
};

module.exports = LayoutCollapseView;
