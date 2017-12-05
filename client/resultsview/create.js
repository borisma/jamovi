'use strict';

const _ = require('underscore');
const $ = require('jquery');

const TableModel = require('./table').Model;
const TableView  = require('./table').View;
const GroupModel = require('./group').Model;
const GroupView  = require('./group').View;
const ImageModel = require('./image').Model;
const ImageView  = require('./image').View;
const ArrayModel = require('./array').Model;
const ArrayView  = require('./array').View;
const SyntaxModel = require('./syntax').Model;
const SyntaxView  = require('./syntax').View;
const HtmlModel = require('./html').Model;
const HtmlView  = require('./html').View;

const createItem = function(element, $el, level, parent, mode, devMode, fmt) {

    if (level === undefined)
        level = 1;
    if (mode === undefined)
        mode = 'rich';

    let model;
    let view;

    if (element.type === 'table') {
        model = new TableModel({
            name: element.name,
            title: element.title,
            element: element.table,
            status: element.status,
            error: element.error });
        view = new TableView({
            el: $el,
            model: model,
            level: level,
            parent: parent,
            mode: mode,
            fmt: fmt });
    }
    else if (element.type === 'group') {

        let visible = false;

        for (let child of element.group.elements) {
            if (child.visible === 0 || child.visible === 2)
                visible = true;
        }

        if (visible) {
            model = new GroupModel({
                name: element.name,
                title: element.title,
                element: element.group,
                status: element.status,
                error: element.error });
            view = new GroupView({
                el: $el,
                model: model,
                create: createItem,
                level: level,
                parent: parent,
                mode: mode,
                devMode: devMode,
                fmt: fmt });
        }
        else {
            view = null;
        }
    }
    else if (element.type === 'image') {
        model = new ImageModel({
            name: element.name,
            title: element.title,
            element: element.image,
            status: element.status,
            error: element.error });
        view = new ImageView({
            el: $el,
            model: model,
            level: level,
            parent: parent,
            mode: mode });
    }
    else if (element.type === 'array') {

        let visible = false;

        for (let child of element.array.elements) {
            if (child.visible === 0 || child.visible === 2)
                visible = true;
        }

        if (visible) {
            model = new ArrayModel({
                name: element.name,
                title: element.title,
                element: element.array,
                status: element.status,
                error: element.error });
            view = new ArrayView({
                el: $el,
                model: model,
                create: createItem,
                level: level,
                parent: parent,
                mode: mode,
                fmt: fmt });
        }
        else {
            view = null;
        }
    }
    else if (element.type === 'preformatted') {
        model = new SyntaxModel({
            name : element.name,
            title : element.title,
            element : element.preformatted,
            status: element.status,
            error: element.error,
            stale: element.stale });
        view = new SyntaxView({
            el: $el,
            model: model,
            level: level,
            parent: parent,
            mode: mode });
    }
    else if (element.type === 'html') {
        model = new HtmlModel({
            name : element.name,
            title : element.title,
            element : element.html,
            status: element.status,
            error: element.error,
            stale: element.stale });
        view = new HtmlView({
            el: $el,
            model: model,
            level: level,
            parent: parent,
            mode: mode });
    }

    return view;
};

module.exports = { createItem: createItem };
