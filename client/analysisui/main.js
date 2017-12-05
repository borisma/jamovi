/* jshint evil: true, strict: true */

'use strict';

const _ = require('underscore');
const $ = require('jquery');
const Backbone = require('backbone');
const Framesg = require('framesg').default;
Backbone.$ = $;

const Options = require('./options');
const OptionsView = require('./optionsview');
const ui = require('./layoutdef');
const Format = require('./format.js');
const FormatDef = require('./formatdef');
const DefaultControls = require('./defaultcontrols');
const LayoutUpdateCheck = require('./layoutupdatecheck');
const View = require('./actions');
const GridTargetControl = require('./gridtargetcontrol');
const GridControl = require('./gridcontrol');
const OptionControl = require('./optioncontrol');
const GridOptionControl = require('./gridoptioncontrol');
const LayoutActionManager = require('./layoutactionmanager');
const RequestDataSupport = require('./requestdatasupport');
const GridOptionListControl = require('./gridoptionlistcontrol');

window._ = _;

const frameCommsApi = {
    setOptionsDefinition: loadAnalysis,

    dataChanged: data => {
        if (analysis !== null) {
            if (data.dataType === 'columns') {
                requestData("columns", null, true).then(columnInfo => {
                    dataResources = { columns: columnInfo.columns };
                    analysis.dataChanged(data);
                });
            }
            else
                analysis.dataChanged(data);
        }
    },

    initialiseOptions: setOptionsValues
};

var parentFrame = new Framesg(window.parent, window.name, frameCommsApi);

var requestData = function(requestType, requestData, getRemote) {
    let data = { requestType: requestType, requestData: requestData };
    if (getRemote)
        return parentFrame.send("requestData", data);
    else if (requestType === "columns") {
        return new Promise((resolve, reject) => {
            resolve(dataResources);
        });
    }
    else if (requestType === "column") {
        if (requestLocalColumnData(data) === false)
            return parentFrame.send("requestData", data);
        else
            return new Promise((resolve, reject) => { resolve(data); });
    }
    else
        return parentFrame.send("requestData", data);
};

var requestLocalColumnData = function(data) {
    var columns = dataResources.columns.concat(analysis.viewTemplate.customVariables);
    let found = false;
    let foundAll = true;
    for (let i = 0; i < columns.length; i++) {
        if ((data.requestData.columnId !== undefined && columns[i].id === data.requestData.columnId) ||
            (data.requestData.columnName !== undefined && columns[i].name === data.requestData.columnName)) {
            found = true;
            for (let p = 0; p < data.requestData.properties.length; p++) {
                let propertyName = data.requestData.properties[p];
                let value = columns[i][propertyName];
                if (value !== undefined)
                    data[propertyName] = columns[i][propertyName];
                else
                    foundAll = false;
            }
            break;
        }
    }

    data.columnFound = found;

    return found && foundAll;
};

var dataResources = { columns: [] };


const Analysis = function(def) {

    eval(def);

    let options = module.exports.options;

    let layoutDef = new module.exports.view.layout();
    this.viewTemplate = new module.exports.view();

    LayoutUpdateCheck(layoutDef);

    this.viewTemplate.setRequestedDataSource(this);

    this.viewTemplate.on("customVariablesChanged", (event) => {
        setTimeout(() => {
            this.dataChanged(event);
        }, 0);
    });

    let actionManager = new LayoutActionManager(this.viewTemplate);
    let optionsManager = new Options(options);
    actionManager.onExecutingStateChanged = function(state) {
        if (state)
            optionsManager.beginEdit();
        else
            optionsManager.endEdit();
    };

    this.model = { options: optionsManager, ui: layoutDef, actionManager: actionManager, currentStage: 0 };

    this.View = new OptionsView( this.model);

    this.View.setRequestedDataSource(this);

    this.requestData = function(requestId, data) {
        return requestData(requestId, data);
    };

    this.dataChanged = function(data) {
        this.View.dataChanged(data);
        if (this.viewTemplate.onDataChanged)
            this.viewTemplate.onDataChanged(data);
    };
};

var analysis = null;
var _analysisResources = null;
var errored = false;
var $header = null;
var $hide = null;



$(document).ready(function() {

    $(document).mousedown(this, mouseDown);
    $(document).mouseup(this, mouseUp);
    $(document).mousemove(this, mouseMove);

    parentFrame.send("frameDocumentReady", null);

    $(window).resize( updateContainerHeight );
});


function loadAnalysis(def) {
    return requestData("columns", null, true).then(data => {

        dataResources = { columns: data.columns };

        analysis = new Analysis(def);

        var title = analysis.model.ui.getTitle();
        console.log("loading - " + title + "...");
        var $title = $('.silky-options-title');
        $title.empty();
        $title.append(title);

        $('body').append(analysis.View.$el);
        analysis.View.render();

        var $hide = $('.silky-sp-back-button');
        $hide.on("click", function(event) {
            closeOptions();
        });

        analysis.model.options.on('options.valuesForServer', onValuesForServerChanges);

        updateContainerHeight();
    });
}

function setOptionsValues(data) {

    if (analysis.View.isLoaded() === false) {
        setTimeout(() => {
            setOptionsValues(data);
        }, 0);
        return;
    }

    var model = analysis.model;
    model.options.beginEdit();
    if (analysis.View.beginDataInitialization()) {
        var params = Options.getDefaultEventParams("changed");
        params.silent = true;
        _.each(data.options, function(value, key, list) {
            model.options.setOptionValue(key, value, params);
        });
        analysis.View.endDataInitialization();
    }
    model.options.endEdit();
}

function onValuesForServerChanges(e) {

    var compiledList = {};

    _.each(e.map, function(value, key, list) {
        compiledList[key] = value.option.getValue();
    });

    parentFrame.send("onOptionsChanged", compiledList);
}


function mouseUp(event) {
    var data = {
        eventName: "mouseup",
        which: event.which,
        pageX: event.pageX,
        pageY: event.pageY
    };

    parentFrame.send("onFrameMouseEvent", data);
}

function mouseMove(event) {
    var data = {
        eventName: "mousemove",
        which: event.which,
        pageX: event.pageX,
        pageY: event.pageY
    };

    parentFrame.send("onFrameMouseEvent", data);
}

function mouseDown(event) {
    var data = {
        eventName: "mousedown",
        which: event.which,
        pageX: event.pageX,
        pageY: event.pageY
    };

    parentFrame.send("onFrameMouseEvent", data);
}


function closeOptions() {
    parentFrame.send("hideOptions", null);
}

function updateContainerHeight() {

    if (analysis === null)
        return;

    var $content = $('.silky-options-content');

    var pos = $content.position();

    var properties = $('body').css(["height", "padding-top", "padding-bottom", "border-top", "border-bottom"]);
    var height = parseFloat(properties.height) - parseFloat(properties["padding-top"]) - parseFloat(properties["padding-bottom"]) - parseFloat(properties["border-top"]) - parseFloat(properties["border-bottom"]);

    var value = height - pos.top;

    $content.css("height", value);
}
