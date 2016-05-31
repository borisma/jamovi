
'use strict';

var $ = require('jquery');
var _ = require('underscore');
var FormatDef = require('./formatdef');
var LayoutGrid = require('./layoutgrid').Grid;
var SelectableLayoutGrid = require('./selectablelayoutgrid');
var DragNDrop = require('./dragndrop');

var LayoutVariablesView = function(params) {
    LayoutGrid.extendTo(this);
    DragNDrop.extendTo(this);

    this._persistentItems = _.isUndefined(params.persistentItems) ? false : params.persistentItems;

    this.rowTransform = function(row, column) {
        return row;
    };

    this.columnTransform = function(row, column) {
        if ( ! this.ignoreTransform)
            return column + 1;

        return column;
    };

    this._targets = [];

    this.supplierGrid = new SelectableLayoutGrid();
    this.supplierGrid.$el.addClass("silky-layout-grid multi-item silky-variable-supplier");
    this.supplierGrid.stretchEndCells = false;
    this.supplierGrid._animateCells = true;
    this.supplierGrid.setMinimumHeight(200);
    this.supplierGrid.setMaximumHeight(200);
    this.ignoreTransform = true;
    var cell = this.addLayout("supplier", 0, 0, false, this.supplierGrid);
    this.ignoreTransform = false;
    cell.horizontalStretchFactor = 0.5;
    cell.dockContentWidth = true;
    cell.dockContentHeight = true;
    cell.spanAllRows = true;

    this.setPickupSourceElement(this.supplierGrid.$el);

    this.getPickupItems = function() {
        return this.getSelectedItems();
    };


    // Catching methods
    this.catchDroppedItems = function(source, items) {

    };

    this.filterItemsForDrop = function(items) {
        var itemsToDrop = [];
        for (var i = 0; i < items.length; i++) {
            itemsToDrop.push(items[i]);
        }
        return itemsToDrop;
    };

    this.inspectDraggedItems = function(source, items) {

    };

    this.dropTargetElement = function() {
        return this.supplierGrid.$el;
    };



    this.addHeader = function(title) {
        var cell = this.addCell(0, 0, false);
    };


    this.setInfo = function(resources, style, level) {

        this.resources = resources;
        this.style = style;
        this.level = level;
        this._items = { _list:[] };

        this.populateItemList();
        this.renderItemList();
    };

    this.getItem = function(index) {
        return this._items._list[index];
    };

    this.getSelectedItems = function() {
        var items = [];
        for (var i = 0; i < this.supplierGrid.selectedCellCount(); i++)
            items.push(this.getItem(this.supplierGrid.getSelectedCell(i).data.row));
        return items;
    };

    this.getSelectedItem = function(index) {
        if (this.supplierGrid.selectedCellCount() > index) {
            var cell = this.supplierGrid.getSelectedCell(index);
            return this.getItem(cell.data.row);
        }

        return null;
    };

    this.pullSelectedItem = function(index) {
        var item = this.getSelectedItem(index);
        if (item !== null)
            item.used += 1;
        return item;
    };

    this.pullItem = function(formatted) {
        for (var i = 0; i < this._items._list.length; i++) {
            var item = this._items._list[i];
            if (item.value.equalTo(formatted)) {
                item.used += 1;
                return item;
            }
        }
    };

    this.pushItem = function(formatted) {
        for (var i = 0; i < this._items._list.length; i++) {
            var item = this._items._list[i];
            if (item.value.equalTo(formatted)) {
                item.used -= 1;
                break;
            }
        }
    };

    this.addTarget = function(target) {

        this.registerDropTargets(target);
        if (target.registerDropTargets || target.dropTargetElement) {
            if (target.registerDropTargets)
                target.registerDropTargets(this);
            for (var t = 0; t < this._targets.length; t++) {
                if (target.registerDropTargets)
                    target.registerDropTargets(this._targets[t]);
                if (target.dropTargetElement && this._targets[t].registerDropTargets)
                    this._targets[t].registerDropTargets(target);
            }
        }

        var targetIndex = this._targets.length;
        this._targets.push(target);
        var self = this;
        target.targetGrid.on('layoutgrid.gotFocus', function() {
            self.supplier.clearSelection();
            for (var i = 0; i < self._targets.length; i++) {
                if (i !== targetIndex)
                    self._targets[i].blockActionButtons();
                else
                    self._targets[i].unblockActionButtons();
            }
        });
    };

    this.isMultiTarget = function() {
        return this._targets.length > 1;
    };

    this.populateItemList = function() {
        var columns = this.resources.columns;
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            var item = { value: new FormatDef.constructor(column.name, FormatDef.variable), used: 0, index: i, properties: { type: column.measureType } };
            this._items._list.push(item);
            this._items[column.name] = item;
        }
    };

    this.selectNextAvaliableItem = function(from) {
        var cell = null;
        for (var r = from; r < this._items._list.length; r++) {
            cell = this.supplierGrid.getCell(0, r);
            if (cell.visible()) {
                this.supplierGrid.selectCell(cell);
                return;
            }
        }
        for (var r1 = from; r1 >= 0; r1--) {
            cell = this.supplierGrid.getCell(0, r1);
            if (cell.visible()) {
                this.supplierGrid.selectCell(cell);
                return;
            }
        }
    };

    this.renderItemList = function() {
        for (var i = 0; i < this._items._list.length; i++) {
            var item = this._items._list[i];
            this['render_' + item.value.format.name](item, i);
        }
    };

    this.render_variable = function(item, row) {

        var $item = $('<div style="white-space: nowrap;" class="silky-list-item silky-format-variable"></div>');
        $item.append('<div style="display: inline-block;" class="silky-variable-type-img silky-variable-type-' + item.properties.type + '"></div>');
        $item.append('<div style="white-space: nowrap;  display: inline-block;" class="silky-list-item-value">' + item.value.toString() + '</div>');

        var c1 = this.supplierGrid.addCell(0, row, false,  $item);
        c1.horizontalStretchFactor = 1;
        c1.dockContentWidth = true;
        c1.clickable(true);

        item.$el = c1.$el;
    };

    this.blockFilterProcess = false;

    this.filterSuppliersList = function() {
        if (this.blockFilterProcess)
            return;

        if (this._persistentItems === false) {
            this.supplierGrid.suspendLayout();
            for (var i = 0; i < this._items._list.length; i++) {
                var item = this._items._list[i];
                var rowCells = this.supplierGrid.getRow(i);
                for (var j = 0; j < rowCells.length; j++) {
                    var cell = rowCells[j];
                    this.supplierGrid.setCellVisibility(cell, item.used === 0);
                }
            }
            this.supplierGrid.resumeLayout();
        }
    };

};

module.exports = LayoutVariablesView;