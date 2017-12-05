
'use strict';


var LayoutGrid = require('./layoutgrid').Grid;
var LayoutGridBorderSupport = require('./layoutgridbordersupport');
var SuperClass = require('../common/superclass');

var SelectableLayoutGrid = function() {
    LayoutGrid.extendTo(this);
    LayoutGridBorderSupport.extendTo(this);

    this.hasFocus = false;
    this._selectedCells = [];
    this.fullRowSelect = false;
    this._rootCell = null;

    this.selectCell = function(cell) {
        if (cell === null)
            return;

        var selected = cell.isSelected();
        if (selected)
            return;

        this.onSelectionChanged(cell, false, false);
    };

    this.onSelectionChanged = function(cell, ctrlKey, shiftKey) {
        var changed = false;
        var selected = cell.isSelected();
        var selectedCell = null;
        var cells = null;

        if (this._selectedCells.length > 0 && shiftKey) {
            var cell2 = this._rootCell;
            var rStart = cell.data.row;
            var cStart = cell.data.column;
            var rEnd = cell2.data.row;
            var cEnd = cell2.data.column;
            var rDiff = rEnd - rStart;
            var cDiff = cEnd - cStart;
            var rDir = rDiff < 0 ? -1 : 1;
            var cDir = cDiff < 0 ? -1 : 1;

            for (var i = 0; i < this._selectedCells.length; i++) {
                selectedCell = this._selectedCells[i];
                var rSel = selectedCell.data.row;
                var cSel = selectedCell.data.column;
                if (((rStart*rDir >= rSel*rDir) && (cStart*cDir >= cSel*cDir) && ((rDiff * rDir) >= ((rEnd - rSel) * rDir)) && ((cDiff * cDir) >= ((cEnd - cSel) * cDir))) === false)  //outside of range
                    this._setCellSelection(false, selectedCell, false, false);
            }

            this._selectedCells = [];

            for (var r = rStart; r*rDir <= rEnd*rDir; r+=rDir) {
                for (var c = cStart; c*cDir <= cEnd*cDir; c+=cDir) {
                    var tCell = this.getCell(c, r);
                    if (tCell.visible()) {
                        cells = this.setCellSelection(true, tCell, ctrlKey, shiftKey);
                        for (var u = 0; u < cells.length; u++)
                            this._selectedCells.unshift(cells[u]);
                        if (this.fullRowSelect)
                            break;
                    }
                }
            }
        }
        else if (selected === false || (ctrlKey === false && this._selectedCells.length > 1)) {
            changed = true;
            cells = this.setCellSelection(true, cell, ctrlKey, shiftKey);
            if (ctrlKey) {
                for (var h = 0; h < cells.length; h++)
                    this._selectedCells.push(cells[h]);
            }
            else {
                for (var j = 0; j < this._selectedCells.length; j++) {
                    selectedCell = this._selectedCells[j];
                    if (this.isCellInArray(selectedCell, cells) === false)
                        this._setCellSelection(false, selectedCell, false, false);
                }
                this._selectedCells = cells;
            }

            this._rootCell = (this._selectedCells.length > 0) ? this._selectedCells[this._selectedCells.length - 1] : null;
        }
        else if (ctrlKey && this._selectedCells.length > 0) {
            changed = true;
            cells = this.setCellSelection(false, cell, ctrlKey, shiftKey);
            if (ctrlKey) {
                for (var k = 0; k < this._selectedCells.length; k++) {
                    selectedCell = this._selectedCells[k];
                    if (this.isCellInArray(selectedCell, cells)) {
                        this._selectedCells.splice(k, 1);
                        break;
                    }
                }
            }
            this._rootCell = (this._selectedCells.length > 0) ? this._selectedCells[this._selectedCells.length - 1] : null;
        }

        var gotFocus = this.hasFocus === false;
        this.hasFocus = true;

        if (gotFocus)
            this.trigger('layoutgrid.gotFocus');

        if (changed)
            this.trigger('layoutgrid.selectionChanged');

    };

    this._setCellSelection = function(value, cell, ctrlKey, shiftKey) {
        cell.setSelection(value, ctrlKey, shiftKey);
        if (value)
            cell.$el.addClass('selected');
        else
            cell.$el.removeClass('selected');
    };

    this.setCellSelection = function(value, cell, ctrlKey, shiftKey) {
        var cells = [];
        var selected = null;
        this._setCellSelection(value, cell, ctrlKey, shiftKey);
        if (this.fullRowSelect) {
            var next = cell.leftCell();
            while (next !== null) {
                if (next.visible()) {
                    selected = next.isSelected();
                    if (selected !== value)
                        this._setCellSelection(value, next, ctrlKey, shiftKey);
                    cells.push(next);
                }
                next = next.leftCell();
            }
            next = cell.rightCell();
            while (next !== null) {
                if (next.visible()) {
                    selected = next.isSelected();
                    if (selected !== value)
                        this._setCellSelection(value, next, ctrlKey, shiftKey);
                    cells.push(next);
                }
                next = next.rightCell();
            }
        }
        cells.push(cell);
        return cells;
    };

    this.isCellInArray = function(cell, array) {
        for (var i = 0; i < array.length; i++) {
            if (cell._id === array[i]._id)
                return true;
        }
        return false;
    };

    this.clearSelection = function() {
        var changed = false;
        for (var i = 0; i < this._selectedCells.length; i++) {
            var selectedCell = this._selectedCells[i];
            selectedCell.setSelection(false, false, false);
            selectedCell.$el.removeClass('selected');
            changed = true;
        }
        this._selectedCells = [];

        var lostFocus = this.hasFocus === true;
        this.hasFocus = false;

        if (lostFocus)
            this.trigger('layoutgrid.lostFocus');

        if (changed)
            this.trigger('layoutgrid.selectionChanged');
    };

    this.selectedCellCount = function() {
        return this._selectedCells.length;
    };

    this.getSelectedCell = function(index) {
        return this._selectedCells[index];
    };

    this.onCellRemoved = function(cell) {
        for (var i = 0; i < this._selectedCells.length; i++) {
            var selectedCell = this._selectedCells[i];
            if (selectedCell._id === cell._id) {
                this._selectedCells.splice(i, 1);
                this.trigger('layoutgrid.selectionChanged');
                break;
            }
        }
    };

    var self = this;

    this._addCellEventListeners = function(cell) {
        cell.on('layoutcell.mousedown', function(ctrlKey, shiftKey) {
            if (cell.isSelected() === false)
                self.onSelectionChanged(cell, ctrlKey, shiftKey);
            else {
                cell.once('layoutcell.mouseup', function(ctrlKey, shiftKey) {
                    self.onSelectionChanged(cell, ctrlKey, shiftKey);
                });
            }
        });
        cell.on('layoutcell.visibleChanged', function() {
            if (cell.isSelected() && cell.visible() === false) {
                self.onSelectionChanged(cell, true, false);
            }
        });
    };
};

SuperClass.create(SelectableLayoutGrid);

module.exports = SelectableLayoutGrid;
